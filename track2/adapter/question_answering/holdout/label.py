"""Label a miner capture against gold answers, then build preference pairs. No model is involved.

    python label.py <capture_dir> --gold queries.gold.json --out <dir>
    python label.py pairs <dir>/labels.jsonl --review <dir>/review.tsv --capture <capture_dir> --out holdout_miners.jsonl

Step 1 writes labels.jsonl, review.tsv and prints a per-system table. A response is `correct` when a gold
answer appears as a whole-token sequence in the answer text; otherwise `needs_review` (gold lists are
incomplete, so nothing is ever auto-labelled incorrect). Refusals are `no_answer`. A human fills the
`verdict` column of review.tsv with incorrect / correct / skip. Step 2 builds pairs from the labels.
"""
import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from itertools import product
from pathlib import Path

from common import contains_tokens, normalize

ANSWER_KEYS = ("answer", "summary", "result", "text", "response")
SYSTEM_OF = {"zk-qa-claims": "zk-text", "zk-qa-proof": "zk-text", "zk-qa-source": "zk-text",
             "textwire-question-answering": "zk-text"}
REFUSAL = re.compile(r"could not find|couldn'?t find|cannot find|can'?t find|no answer|not found|unable to|"
                     r"no information|no results?\b|no relevant", re.I)
RELATED_SLUGS = {"livecert"}
BODY_CAP = 6000
TRUNC = 400
STATES = ("correct", "needs_review", "no_answer", "unusable")


def system_of(slug):
    return SYSTEM_OF.get(slug, slug)


def parse_json(body):
    try:
        return json.loads(body)
    except ValueError:
        return None


def extract_answer(body):
    """(answer_text, structured_no_answer, is_error_object) from a raw response body."""
    obj = parse_json(body)
    if isinstance(obj, dict):
        structured_none = obj.get("found") is False or str(obj.get("verdict", "")).lower() == "not_found"
        for key in ANSWER_KEYS:
            if isinstance(obj.get(key), str) and obj[key].strip():
                return obj[key].strip(), structured_none, False
        if "error" in obj:
            return "", structured_none, True
        return body.strip(), structured_none, False
    return body.strip(), False, False


def classify(status, body, gold):
    """Return (label, answer_text) for one response."""
    if status != 200 or not isinstance(body, str) or not body.strip():
        return "unusable", ""
    text, structured_none, is_error = extract_answer(body)
    if is_error or not text:
        return "unusable", ""
    if structured_none:
        return "no_answer", text
    markup = text.lstrip().startswith("<")  # XML/HTML pages never auto-count as a correct answer
    if not markup:
        norm = normalize(text)
        if any(contains_tokens(norm, normalize(g)) for g in gold):
            return "correct", text
    if REFUSAL.search(text):
        return "no_answer", text
    return "needs_review", text


def load_capture(capture_dir):
    miners = {}
    for path in sorted(Path(capture_dir).glob("miner-*.json")):
        d = json.loads(path.read_text(encoding="utf-8"))
        miners[d["slug"]] = d
    return miners


def label_capture(miners, gold):
    """One labelled response per (system, query): the first slug in sorted order that is usable."""
    order, kept, seen_q = [], {}, set()
    for slug in sorted(miners):
        for r in miners[slug]["responses"]:
            qid = r["query_id"]
            if qid not in gold:
                raise SystemExit(f"query {qid} has no gold answers")
            if qid not in seen_q:
                seen_q.add(qid)
                order.append(qid)
            label, text = classify(r.get("status"), r.get("body"), gold[qid])
            key = (system_of(slug), qid)
            if label == "unusable" or key in kept:
                continue
            body = r["body"]
            kept[key] = {"query_id": qid, "query": r["query"], "system": key[0], "slug": slug,
                         "related_party": bool(miners[slug].get("related_party")), "label": label,
                         "answer_text": text, "body_sha256": hashlib.sha256(body.encode("utf-8")).hexdigest()}
    rows = [kept[k] for qid in order for k in sorted(kept) if k[1] == qid]
    return rows, order


def flat(text, n=TRUNC):
    return " ".join(text.split())[:n]


def run_label(args):
    gold = json.loads(Path(args.gold).read_text(encoding="utf-8"))
    miners = load_capture(args.capture_dir)
    rows, _ = label_capture(miners, gold)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "labels.jsonl").write_bytes("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows).encode("utf-8"))
    head = "query_id\tquery\tgold\tsystem\tslug\tlabel\tanswer_text\tverdict"
    lines = [head] + ["\t".join([r["query_id"], flat(r["query"]), " | ".join(gold[r["query_id"]]), r["system"],
                                 r["slug"], r["label"], flat(r["answer_text"]), ""])
                      for r in rows if r["label"] in ("needs_review", "no_answer")]
    (out / "review.tsv").write_bytes(("\n".join(lines) + "\n").encode("utf-8"))
    table = {s: Counter() for s in {system_of(m) for m in miners}}
    for r in rows:
        table[r["system"]][r["label"]] += 1
    for slug, d in miners.items():  # unusable responses are not kept; count them per system, per response
        for x in d["responses"]:
            if classify(x.get("status"), x.get("body"), [""])[0] == "unusable":
                table[system_of(slug)]["unusable"] += 1
    print(f"{'system':32}" + "".join(f"{s:>14}" for s in STATES))
    for s in sorted(table):
        print(f"{s:32}" + "".join(f"{table[s][k]:>14}" for k in STATES))
    print("note: unusable counts every unusable response (all slugs of a system); the other columns count one kept "
          "response per (system, query)")


def read_review(path):
    verdicts = {}
    lines = Path(path).read_text(encoding="utf-8").splitlines()
    for ln in lines[1:]:
        cols = ln.split("\t")
        if len(cols) >= 8 and cols[7].strip():
            verdicts[(cols[0], cols[3])] = cols[7].strip().lower()
    return verdicts


def sides(rows, verdicts):
    """Split kept rows into chosen candidates and (rejected candidate, kind) pairs per query."""
    good, bad = {}, {}
    for r in rows:
        v = verdicts.get((r["query_id"], r["system"]))
        if r["label"] == "correct" or v == "correct":
            good.setdefault(r["query_id"], []).append(r)
        elif r["label"] == "needs_review" and v == "incorrect":
            bad.setdefault(r["query_id"], []).append((r, "wrong_answer"))
        elif r["label"] == "no_answer" and v != "skip":
            bad.setdefault(r["query_id"], []).append((r, "no_answer"))
    return good, bad


def build_pairs(rows, verdicts, bodies):
    """bodies: {(slug, query_id): raw body}. Two rows (body, text) per eligible combination."""
    good, bad = sides(rows, verdicts)
    out, seen = [], set()
    for qid in sorted(good):
        for g, (b, kind) in product(good[qid], bad.get(qid, [])):
            if g["system"] == b["system"]:
                continue
            related = RELATED_SLUGS & {g["slug"], b["slug"]} != set()
            texts = {"body": (bodies[(g["slug"], qid)][:BODY_CAP], bodies[(b["slug"], qid)][:BODY_CAP]),
                     "text": (g["answer_text"], b["answer_text"])}
            for fmt, (c, rj) in texts.items():
                key = (g["query"], c, rj)
                if c == rj or key in seen or not c.strip() or not rj.strip():
                    continue
                seen.add(key)
                out.append({"prompt": g["query"], "chosen": c, "rejected": rj, "kind": kind, "format": fmt,
                            "source": "miners", "systems": f"{g['system']}>{b['system']}",
                            "related_party": related})
    return out


def run_pairs(args):
    rows = [json.loads(ln) for ln in Path(args.labels).read_text(encoding="utf-8").splitlines() if ln.strip()]
    miners = load_capture(args.capture)
    bodies = {(s, r["query_id"]): r["body"] for s, d in miners.items() for r in d["responses"]
              if isinstance(r.get("body"), str)}
    pairs = build_pairs(rows, read_review(args.review), bodies)
    Path(args.out).write_bytes("".join(json.dumps(p, ensure_ascii=False) + "\n" for p in pairs).encode("utf-8"))
    print(f"wrote {len(pairs)} rows to {args.out}")
    for title, key in (("kind", "kind"), ("format", "format"), ("system pair", "systems")):
        print(title, dict(Counter(p[key] for p in pairs)))
    for fmt in ("body", "text"):
        sub = [p for p in pairs if p["format"] == fmt]
        longer = sum(len(p["chosen"]) > len(p["rejected"]) for p in sub)
        print(f"longer side chosen ({fmt}): {longer}/{len(sub)}")


def main(argv):
    if argv and argv[0] == "pairs":
        ap = argparse.ArgumentParser(prog="label.py pairs")
        ap.add_argument("pairs")
        ap.add_argument("labels")
        ap.add_argument("--review", required=True)
        ap.add_argument("--capture", required=True)
        ap.add_argument("--out", required=True)
        run_pairs(ap.parse_args(argv))
    else:
        ap = argparse.ArgumentParser()
        ap.add_argument("capture_dir")
        ap.add_argument("--gold", required=True)
        ap.add_argument("--out", required=True)
        run_label(ap.parse_args(argv))


if __name__ == "__main__":
    main(sys.argv[1:])
