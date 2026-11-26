"""Preference pairs for DOCUMENT_AUTHENTICITY (generator v2). Every label is computed from the evidence in the query.

The family's task (bounties #80): "Query supplies a document plus its signature, seal or timestamp data and asks
whether it is genuine and unaltered: certificate chain, notarization, tamper-evident seal, checksum." Each query here
is assembled by this script, so every check is a comparison the query itself shows:
- checksum: the SHA-256 computed on the received file against the hash in the signed manifest;
- chain: each certificate's issuer is the next one's subject, ending at the stated trusted root;
- validity: the signing time falls inside the signer certificate's validity window;
- revocation: the signer serial is not on the supplied CRL (or was revoked after signing);
- timestamp: the timestamp authority's time is not before the document's own date;
- seal: the seal number matches the notary register entry for this document.
The better answer gives the verdict and names every check that fails, and the ones that pass. The worse answer is the
same style with one thing wrong: the verdict, the failing check named, a second failure missed. No pool row, public pair
or miner answer is used.

v2 change: the checksum evidence shows the first 12 hex chars of each hash ahead of the full hash, and a forged hash
always differs from the manifest inside those 12 chars, so a mismatch is readable without comparing 64 characters.
The checksum-passing answer now quotes the matching 12-char prefixes, as the failing answer already did.

    python -I generate_pairs_v2.py --tokenizer C:/Users/hyada/tg-eval/foundation/tokenizer.json \
        --out C:/Users/hyada/tg-eval/pairs/da_v2
"""
import argparse
import copy
import datetime as dt
import hashlib
import json
import os
import random

MAX_TOKENS = 500
DOCS = ["Sale deed", "Board resolution", "Degree certificate", "Bill of lading", "Power of attorney", "Lease agreement",
        "Export licence", "Medical fitness certificate", "Share transfer form", "Bank guarantee", "Land survey report",
        "Employment letter", "Customs declaration", "Insurance policy", "Audit report", "Birth certificate",
        "Warehouse receipt", "Tender award letter", "Shipping invoice", "Notarised affidavit"]
ISSUERS = ["Acme Trust CA", "NorthGate Signing CA", "Indus Root CA", "Meridian Qualified CA", "Helios eSign CA",
           "Polaris Notary CA", "Orbit Issuing CA", "Granite Root Authority", "Saffron eID CA", "Cobalt TSA"]
SIGNERS = ["R. Mehta", "J. Alvarez", "K. Osei", "L. Novak", "A. Iyer", "M. Tanaka", "S. Haddad", "P. Kowalski",
           "D. Okafor", "E. Lindqvist", "N. Rao", "F. Moreau"]
CHECKS = ["checksum", "chain", "validity", "revocation", "timestamp", "seal"]
ASKS = ["Is this {doc} genuine and unaltered? Verify the signature data below.\n\n{ev}",
        "Authenticity check for {doc} ({ref}).\n{ev}\nIs it genuine? Which checks fail, if any?",
        "Verify document {ref}: certificate chain, timestamp, seal and checksum.\n\n{ev}",
        "Before we accept this {doc}, confirm it has not been tampered with:\n{ev}"]


def h(seed):
    return hashlib.sha256(seed.encode()).hexdigest()


def vocab(split):
    pick = (lambda i: i % 5 == 0) if split == "test" else (lambda i: i % 5 != 0)
    return ([d for i, d in enumerate(DOCS) if pick(i)], [x for i, x in enumerate(ISSUERS) if pick(i) or len(ISSUERS) < 5],
            [x for i, x in enumerate(SIGNERS) if pick(i)])


def scenario(rng, split):
    docs, issuers, signers = vocab(split)
    issuers = issuers if len(issuers) >= 3 else ISSUERS
    doc, signer = rng.choice(docs), rng.choice(signers)
    root, inter = rng.sample(issuers, 2)
    day = dt.date(2025, 1, 1) + dt.timedelta(days=rng.randint(0, 600))
    sign = dt.datetime.combine(day, dt.time(rng.randint(8, 18), rng.randint(0, 59)))
    nb, na = sign - dt.timedelta(days=rng.randint(30, 600)), sign + dt.timedelta(days=rng.randint(30, 700))
    content = h(f"{doc}{signer}{rng.random()}")
    e = dict(doc=doc, ref=f"DOC-{rng.randint(10000, 99999)}", signer=signer, root=root, inter=inter,
             chain=[(signer, inter), (inter, root), (root, root)], trusted=root, sign=sign, nb=nb, na=na,
             computed=content, manifest=content, serial=f"{rng.randint(0x1000, 0xFFFF):X}", crl=[], revoked_at=None,
             doc_date=day, tsa=sign + dt.timedelta(minutes=rng.randint(1, 50)), seal=f"S-{rng.randint(100000, 999999)}")
    e["register_seal"] = e["seal"]
    e["crl"] = [f"{rng.randint(0x1000, 0xFFFF):X}" for _ in range(rng.randint(1, 3))]
    fails = rng.choice([[], [], rng.sample(CHECKS, 1), rng.sample(CHECKS, 1), rng.sample(CHECKS, 1), rng.sample(CHECKS, 2)])
    for c in fails:
        breaks(e, c, rng)
    return e, fails


def breaks(e, c, rng):
    if c == "checksum":
        # v2: the forged hash differs from the manifest inside its first 12 hex chars, so the short form shows it
        s = list(h(e["computed"] + "x"))
        for i in rng.sample(range(12), rng.randint(2, 5)):
            s[i] = rng.choice([x for x in "0123456789abcdef" if x != e["manifest"][i]])
        e["computed"] = "".join(s)
    elif c == "chain":
        e["chain"][0] = (e["signer"], rng.choice([x for x in ISSUERS if x not in (e["inter"], e["root"])]))
    elif c == "validity":
        e["na"] = e["sign"] - dt.timedelta(days=rng.randint(1, 90))
        e["nb"] = min(e["nb"], e["na"] - dt.timedelta(days=200))
    elif c == "revocation":
        e["crl"].append(e["serial"])
        e["revoked_at"] = e["sign"] - dt.timedelta(days=rng.randint(1, 60))
    elif c == "timestamp":
        e["tsa"] = dt.datetime.combine(e["doc_date"], dt.time(0, 0)) - dt.timedelta(days=rng.randint(1, 30))
    elif c == "seal":
        e["register_seal"] = f"S-{rng.randint(100000, 999999)}"


def evidence(e, rng):
    lines = [f"Document: {e['doc']} {e['ref']}, dated {e['doc_date']}, signed by {e['signer']} at {e['sign']:%Y-%m-%d %H:%M} UTC",
             f"SHA-256 of received file, first 12 hex: {e['computed'][:12]} (full: {e['computed']})",
             f"SHA-256 in signed manifest, first 12 hex: {e['manifest'][:12]} (full: {e['manifest']})",
             "Certificate chain: " + " -> ".join(f"{s} (issued by {i})" for s, i in e["chain"]),
             f"Trusted root: {e['trusted']}",
             f"Signer certificate serial {e['serial']}, valid {e['nb']:%Y-%m-%d} to {e['na']:%Y-%m-%d}",
             f"CRL from {e['inter']}: " + ", ".join(e["crl"]) +
             (f" (serial {e['serial']} revoked {e['revoked_at']:%Y-%m-%d})" if e["revoked_at"] else ""),
             f"Timestamp token from {rng.choice(['Cobalt TSA', 'Polaris TSA', 'Helios TSA'])}: {e['tsa']:%Y-%m-%d %H:%M} UTC",
             f"Seal number on document: {e['seal']}; notary register entry for {e['ref']}: {e['register_seal']}"]
    rng.shuffle(lines[1:])
    return "\n".join(f"- {x}" for x in lines)


def say(e, c, ok):
    if c == "checksum":
        return f"checksum: the received file's SHA-256 ({e['computed'][:12]}…) matches the signed manifest's ({e['manifest'][:12]}…)" if ok else \
            f"checksum: the received file's SHA-256 ({e['computed'][:12]}…) differs from the manifest's ({e['manifest'][:12]}…)"
    if c == "chain":
        return f"chain: {e['signer']} -> {e['inter']} -> {e['root']} ends at the trusted root" if ok else \
            f"chain: the signer's certificate is issued by {e['chain'][0][1]}, which is not {e['inter']}, so it does not chain to {e['root']}"
    if c == "validity":
        return f"validity: signed {e['sign']:%Y-%m-%d}, inside {e['nb']:%Y-%m-%d} to {e['na']:%Y-%m-%d}" if ok else \
            f"validity: signed {e['sign']:%Y-%m-%d}, after the certificate expired on {e['na']:%Y-%m-%d}"
    if c == "revocation":
        return f"revocation: serial {e['serial']} is not on the CRL" if ok else \
            f"revocation: serial {e['serial']} was revoked on {e['revoked_at']:%Y-%m-%d}, before signing"
    if c == "timestamp":
        return f"timestamp: {e['tsa']:%Y-%m-%d %H:%M} is after the document date" if ok else \
            f"timestamp: {e['tsa']:%Y-%m-%d} is before the document's own date {e['doc_date']}"
    return f"seal: {e['seal']} matches the notary register" if ok else \
        f"seal: {e['seal']} on the document, but the register records {e['register_seal']}"


def answer(e, style, genuine, failed):
    items = [say(e, c, False) for c in CHECKS if c in failed] + [say(e, c, True) for c in CHECKS if c not in failed]
    if style == "json":
        return json.dumps({"genuine": genuine, "unaltered": "checksum" not in failed,
                           "failed_checks": [c for c in CHECKS if c in failed], "explanation": "; ".join(items)},
                          ensure_ascii=False)
    head = "Genuine and unaltered." if genuine else "Not genuine."
    if style == "table":
        return f"| Verdict | {head} |\n|---|---|\n" + "\n".join(f"| {i.split(':')[0]} | {i.split(': ', 1)[1]} |" for i in items)
    if style == "bullets":
        return head + "\n" + "\n".join(f"- {i}" for i in items)
    return f"{head} {e['ref']}: " + "; ".join(items) + "."


def pair(rng, split, styles):
    e, fails = scenario(rng, split)
    style = rng.choice(styles)
    chosen = answer(e, style, not fails, fails)
    weights = {"verdict": 1} if not fails else {"verdict": 4, "wrong_check": 2}
    if len(fails) > 1:
        weights["missed"] = 2
    bad = rng.choices(list(weights), weights=list(weights.values()))[0]
    if bad == "verdict":  # the other verdict, with every check reported as passing (or failing) to match
        rejected = answer(e, style, True, []) if fails else None
        if not fails:
            t = copy.deepcopy(e)
            c = rng.choice(CHECKS)
            breaks(t, c, rng)  # the answer describes evidence the query does not show
            rejected = answer(t, style, False, [c])
    elif bad == "wrong_check":  # the failure blamed on a check that passes, described from altered evidence
        swap = rng.choice([c for c in CHECKS if c not in fails])
        t = copy.deepcopy(e)
        breaks(t, swap, rng)
        named = [swap if c == fails[0] else c for c in fails]
        rejected = answer(t, style, False, named)
    else:
        rejected = answer(e, style, False, fails[:1])
    if rejected == chosen:
        return None
    ask = rng.choice(ASKS).format(doc=e["doc"].lower(), ref=e["ref"], ev=evidence(e, rng))
    return dict(prompt=ask, chosen=chosen, rejected=rejected, kind=",".join(fails) or "genuine", bad=bad, style=style)


def build(n, seed, split, tok, styles):
    rng = random.Random(seed)
    rows, seen = [], set()
    while len(rows) < n:
        r = pair(rng, split, styles)
        if not r or r["prompt"] in seen:
            continue
        lens = [len(tok.encode(f"### Task:\n{r['prompt']}\n\n### Answer:\n{r[k]}").ids) for k in ("chosen", "rejected")]
        if max(lens) > MAX_TOKENS:
            continue
        seen.add(r["prompt"])
        rows.append(r)
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tokenizer", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--n", type=int, default=3000)
    a = ap.parse_args()
    from tokenizers import Tokenizer
    tok = Tokenizer.from_file(a.tokenizer)
    os.makedirs(a.out, exist_ok=True)
    styles = ["json", "prose", "bullets"]
    train = build(a.n + 300, 7, "train", tok, styles)
    sets = {"train": train[:a.n], "val": train[a.n:], "test": build(400, 97, "test", tok, styles),
            "probe": build(300, 131, "test", tok, ["table"])}
    for name, rows in sets.items():
        with open(os.path.join(a.out, f"{name}.jsonl"), "w", encoding="utf-8", newline="\n") as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        print(name, len(rows))


if __name__ == "__main__":
    main()
