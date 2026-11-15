"""Build URL_SCAN_VERDICT preference pairs (train/val/test) and the frozen H1 holdout.

Unsafe hosts: the CERT Polska Warning List. Safe hosts: the Majestic Million top 50,000
(minus anything CERT lists). Splits are by registrable domain (Public Suffix List), hashed,
so no registrable domain is in two splits. Probe, V1-cohort and IANA example domains are
excluded everywhere. H1 also uses two response formats and two prompt wordings that never
appear in training. No pool row, miner answer or captured response is read.

    python build_pairs_v2.py --sources C:/Users/hyada/tg-eval/data/urlscan_sources_r1 \
        --out C:/Users/hyada/tg-eval/pairs/urlscan_v2
"""
import argparse
import csv
import hashlib
import json
import random
from pathlib import Path

import synth as S
from synth_mimic import MIMIC_FORMATS

SPLITS = {"train": (0, 80), "val": (80, 86), "test": (86, 90), "holdout": (90, 95), "real": (95, 100)}
SIZES = {"train": 4000, "val": 400, "test": 400, "holdout": 200}
# V3 (one final iteration): real-miner-shaped formats, 60% cross-format pairs left at their natural
# lengths (format is drawn independently of the label), more contradiction pairs, balanced weak
# kinds. H1 is not regenerated: the frozen V2 H1 stays the holdout.
V3 = {"sizes": {"train": 5000, "val": 400, "test": 400}, "same_format": 0.4,
      "kinds": {"false_safe_weak": 15, "false_safe_contradiction": 12, "false_safe_prior": 9,
                "false_unsafe_weak": 15, "false_unsafe_contradiction": 12, "false_unsafe_prior": 9,
                "wrong_url": 18, "stale": 4, "unsupported": 4, "non_answer": 4}}
EXCLUDE = {"example.com", "example.org", "example.net", "msft.net", "testsafebrowsing.appspot.com",
           "eicar.org", "microsoft.com", "iana.org", "cert.pl"}
V1_CASES = ["C:/Users/hyada/tg-eval/urlscan-certpl-v1/cases.json",
            "C:/Users/hyada/tg-eval/urlscan-holdout-v1/cases.json"]
KINDS = {"false_safe_weak": 15, "false_safe_contradiction": 9, "false_safe_prior": 9,
         "false_unsafe_weak": 13, "false_unsafe_contradiction": 9, "false_unsafe_prior": 9,
         "wrong_url": 18, "stale": 4, "unsupported": 4, "non_answer": 4}
PATHS = ["/", "/login", "/account/verify", "/pay", "/download", "/news", "/help/contact", "/index.php?id={n}",
         "/products/{n}", "/en/", "/signin?next=%2F", "/track/{n}", "/blog/2026/{n}", "/docs/start"]
PROMPTS = ["Is {url} safe to visit?", "Is this URL safe to click: {url}?", "Is {url} a phishing or malware page?",
           "Should I open {url}?", "Check {url}: is it safe to open?", "Can I safely visit {url}?",
           "Is the link {url} safe?", "Scan {url} and tell me whether it is safe."]
HOLDOUT_PROMPTS = ["Someone sent me {url}. Is it dangerous?", "Verdict please: is {url} safe or malicious?"]


class PSL:
    def __init__(self, path):
        self.rules = set()
        for line in Path(path).read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("//"):
                self.rules.add(line.split()[0].lower())

    def registrable(self, host):
        labels = host.lower().strip(".").split(".")
        best = 1  # default rule "*": the last label is the suffix
        for i in range(len(labels)):
            cand = ".".join(labels[i:])
            wild = ".".join(["*"] + labels[i + 1:])
            if "!" + cand in self.rules:
                best = len(labels) - i - 1
                break
            if cand in self.rules or (i + 1 < len(labels) and wild in self.rules):
                best = max(best, len(labels) - i)
        return ".".join(labels[-(best + 1):]) if len(labels) > best else host.lower()


def bucket(reg):
    return int(hashlib.sha256(("urlscan-v2:" + reg).encode()).hexdigest(), 16) % 100


def split_of(reg):
    b = bucket(reg)
    return next(name for name, (lo, hi) in SPLITS.items() if lo <= b < hi)


def load_hosts(src, psl):
    cert = [d.strip().lower() for d in (src / "certpl_domains.txt").read_text(encoding="utf-8").splitlines()
            if d.strip() and d.isascii()]
    excluded = set(EXCLUDE)
    for path in V1_CASES:
        for case in json.loads(Path(path).read_text(encoding="utf-8")):
            excluded.add(psl.registrable(case["url"].split("/")[2]))
    cert_regs = {psl.registrable(d) for d in cert}
    unsafe = {}
    for d in cert:
        reg = psl.registrable(d)
        if reg not in excluded:
            unsafe.setdefault(split_of(reg), []).append((d, reg, None))
    safe = {}
    with open(src / "majestic_million.csv", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            rank = int(row["GlobalRank"])
            if rank > 50000:
                break
            d = row["Domain"].lower()
            reg = psl.registrable(d)
            if d.isascii() and reg not in cert_regs and reg not in excluded and d not in cert_regs:
                safe.setdefault(split_of(reg), []).append((d, reg, rank))
    return unsafe, safe, sorted(excluded)


def make_url(rng, host, safe):
    if safe and rng.random() < 0.6 and host.count(".") == 1:
        host = "www." + host
    path = rng.choice(PATHS).format(n=rng.randint(10, 99999))
    return f"{'https' if rng.random() < 0.8 else 'http'}://{host}{path}", host


def when(rng, old=False):
    if old:
        return "%d-%02d-%02dT%02d:%02d:%02dZ" % (rng.randint(2019, 2023), rng.randint(1, 12), rng.randint(1, 28),
                                                rng.randint(0, 23), rng.randint(0, 59), rng.randint(0, 59))
    return "2026-%s" % rng.choice(["10-%02d" % rng.randint(20, 31), "11-%02d" % rng.randint(1, 7)]) + \
        "T%02d:%02d:%02dZ" % (rng.randint(0, 23), rng.randint(0, 59), rng.randint(0, 59))


def support(rng, safe, rank):
    if safe:
        pool = [e for e in S.CLEAN if rank is not None or e[0] != "Popularity ranking"]
        ev = rng.sample(pool, rng.randint(2, 4))
        if rng.random() < 0.4:  # benign sites show heuristic features too; a good answer weighs them
            ev.append(rng.choice(S.HEURISTIC[1:5]))
    else:
        ev = rng.sample(S.HITS, rng.randint(1, 2))
        ev += rng.sample([[S.WEAK[2]], [S.NEUTRAL[0], S.NEUTRAL[1]], [S.NEUTRAL[2]], []], 1)[0]
        if rng.random() < 0.4:
            ev.append(rng.choice(S.HEURISTIC))
        if rng.random() < 0.35:  # correct unsafe answers often also report an unreachable or unknown host
            ev.append(rng.choice([S.WEAK[3], S.WEAK[4], S.WEAK[0], S.WEAK[1], S.WEAK[5]]))
    if rng.random() < 0.15:
        ev.append(rng.choice(S.VAGUE))
    rng.shuffle(ev)
    return ev


def build_pair(rng, kind, target, partner, names, prompts, same_format=0.45):
    (host0, reg, rank), truth = target
    url, host = make_url(rng, host0, truth)
    ctx = S.random_choice_ctx(rng, rank)
    t = when(rng)
    n_extra = rng.choice([0, 0, 2, 4, 6, 8, 10])  # one size per pair, so details never tell the sides apart
    rec = lambda u, h, safe, ev, reasons, at=t: S.make_record(rng, u, h, safe, ev, rng.choice(reasons), at, ctx,
                                                              n_extra)
    safe_reasons = S.SAFE_REASONS + S.WEAK_SAFE_REASONS  # reasons carry no label on their own:
    unsafe_reasons = S.UNSAFE_REASONS + S.HEURISTIC_UNSAFE_REASONS  # only the verdict vs truth does
    good_reasons = safe_reasons if truth else unsafe_reasons
    bad_reasons = unsafe_reasons if truth else safe_reasons
    shared = None
    if kind.endswith("_weak"):
        if rng.random() < 0.3:
            c = rec(url, host, truth, rng.sample(S.NEUTRAL if truth else S.WEAK, 2), good_reasons)
        else:
            c = rec(url, host, truth, support(rng, truth, rank), good_reasons)
        wrong_ev = rng.sample(S.HEURISTIC if truth else S.WEAK, rng.randint(2, 3))
        if rng.random() < 0.35:  # a true fact the wrong verdict ignores
            wrong_ev.append(S.CLEAN[0] if truth else S.HITS[-1])
        r = rec(url, host, not truth, wrong_ev, bad_reasons)
    elif kind.endswith("_contradiction") or kind.endswith("_prior"):
        shared = support(rng, truth, rank) if kind.endswith("_contradiction") else rng.sample(S.NEUTRAL, rng.randint(2, 3))
        c = rec(url, host, truth, shared, good_reasons)
        r = rec(url, host, not truth, shared, bad_reasons)
    elif kind == "wrong_url":
        c = rec(url, host, truth, support(rng, truth, rank), good_reasons)
        if rng.random() < 0.25:
            (other_url, other_host), other_truth, other_rank = make_url(rng, host0, truth), truth, rank
            if other_url == url:
                other_url = url.rstrip("/") + "/home"
        else:
            (h2, _, other_rank), other_truth = partner
            other_url, other_host = make_url(rng, h2, other_truth)
        ctx["rank"] = other_rank
        r = rec(other_url, other_host, other_truth, support(rng, other_truth, other_rank),
                safe_reasons if other_truth else unsafe_reasons)
    elif kind == "stale":
        ev = support(rng, truth, rank)
        c = rec(url, host, truth, ev, good_reasons)
        c["reason"] = f"not cached, live result from {t[:10]}: " + c["reason"]
        old = when(rng, old=True)
        r = rec(url, host, truth, ev, good_reasons, at=old)
        r["reason"] = f"cached result from {old[:10]}: " + r["reason"]
    elif kind == "unsupported":
        c = rec(url, host, truth, support(rng, truth, rank), good_reasons)
        r = rec(url, host, truth, rng.sample(S.VAGUE, rng.randint(1, 2)), good_reasons)
    else:
        c = rec(url, host, truth, support(rng, truth, rank), good_reasons)
        r = S.non_answer(rng, url, host, t, ctx, n_extra)
    fc = rng.choice(names)
    fr = fc if rng.random() < same_format else rng.choice(names)
    prompt = rng.choice(prompts).format(url=url)
    if shared and rng.random() < 0.25:
        prompt += f" Context: a scan reported that {shared[0][2].format(**ctx)}."
    return prompt, c, r, fc, fr


def make_split(rng, name, unsafe, safe, n, formats, names, prompts, kinds_w=KINDS, same_format=0.45):
    kinds = list(kinds_w)
    weights = [kinds_w[k] for k in kinds]
    rows, tries = [], 0
    kind = None
    while len(rows) < n:
        tries += 1
        kind = kind or rng.choices(kinds, weights)[0]  # kept until a pair of this kind fits
        truth = (not kind.startswith("false_safe")) if kind.startswith("false_") else rng.random() < 0.5
        target = (rng.choice(safe if truth else unsafe), truth)
        p_truth = rng.random() < 0.5
        partner = (rng.choice(safe if p_truth else unsafe), p_truth)
        if partner[0][1] == target[0][1]:
            continue
        prompt, c, r, fc, fr = build_pair(rng, kind, target, partner, names, prompts, same_format)
        cs, rs = formats[fc](c), formats[fr](r)
        if fc != fr and same_format < 0.45:
            pass  # V3 cross-format pairs keep natural lengths; format is independent of the label
        elif abs(len(cs) - len(rs)) > 48:
            continue  # resample rather than pad a long way: a long trace is its own tell
        else:
            top = max(len(cs), len(rs))
            cs = S.pad_to(rng, c, formats[fc], top + rng.randint(0, 8))
            rs = S.pad_to(rng, r, formats[fr], top + rng.randint(0, 8))
        rows.append({"prompt": prompt, "chosen": cs, "rejected": rs, "kind": kind, "format": f"{fc}|{fr}",
                     "truth_safe": truth, "domain": target[0][1], "partner_domain": partner[0][1]
                     if kind == "wrong_url" else None, "split": name})
        kind = None
    return rows, tries


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sources", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--seed", type=int, default=20261108)
    ap.add_argument("--profile", choices=["v2", "v3"], default="v2")
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=False)
    psl = PSL(a.sources / "public_suffix_list.dat")
    unsafe, safe, excluded = load_hosts(a.sources, psl)
    manifest = {"seed": a.seed, "sources": json.loads((a.sources / "MANIFEST.json").read_text(encoding="utf-8")),
                "excluded_registrable_domains": excluded, "kinds": KINDS, "splits": {}}
    v3 = a.profile == "v3"
    if v3:
        manifest["kinds"], manifest["profile"] = V3["kinds"], "v3"
    for name, n in (V3["sizes"] if v3 else SIZES).items():
        rng = random.Random(f"{a.seed}:{a.profile}:{name}" if v3 else f"{a.seed}:{name}")
        formats = {**S.TRAIN_FORMATS, **S.HOLDOUT_FORMATS, **MIMIC_FORMATS}
        names = list(S.TRAIN_FORMATS) + (list(S.HOLDOUT_FORMATS) * 4 if name == "holdout" else [])  # H1: half unseen
        if v3:
            names = list(S.TRAIN_FORMATS) + list(MIMIC_FORMATS) * 2  # real-miner shapes are ~55% of answers
        prompts = PROMPTS if name != "holdout" else PROMPTS + HOLDOUT_PROMPTS * 2
        rows, tries = make_split(rng, name, unsafe[name], safe[name], n, formats, names, prompts,
                                 V3["kinds"] if v3 else KINDS, V3["same_format"] if v3 else 0.45)
        path = a.out / f"{name}.jsonl"
        path.write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
        manifest["splits"][name] = {"pairs": len(rows), "tries": tries, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                                    "unsafe_hosts_available": len(unsafe[name]), "safe_hosts_available": len(safe[name])}
        print(name, manifest["splits"][name], flush=True)
    (a.out / "manifest.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
