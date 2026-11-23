"""Build the LiveCert self-check set (ARCHITECTURE A7, condition 2): for each frozen query where LiveCert's own answer
is wrong, a pair of the correct answer (our held-out test pair's better answer) against LiveCert's response as the
node would see it (the whole body). An adapter for an intent LiveCert serves must order these pairs correctly.

    python -I selfcheck_pairs.py --intent SENTIMENT_ANALYSIS_GENERAL --capture <cap dir> --pairs <test.jsonl> --out <file>

Labels:
- sentiment: LiveCert's `verdict` against the star label;
- fact check: `verdict` True/False against FEVER's label;
- question answering: whether the gold span (or "not answerable") appears in LiveCert's `answer`.
"""
import argparse
import json
import pathlib


def gold_span(chosen):
    try:
        j = json.loads(chosen)
        return None if j.get("answer") is None else str(j["answer"])
    except (ValueError, AttributeError):
        pass
    if chosen.startswith("According to the passage, "):
        return chosen[len("According to the passage, "):].rstrip(".")
    if "does not" in chosen or "cannot be answered" in chosen:
        return None
    return chosen


def wrong(intent, body, chosen):
    if intent.startswith("SENTIMENT"):
        want = "positive" if '"Positive"' in chosen or "Positive" in chosen.split(".")[0] or "positive:" in chosen else "negative"
        return str(body.get("verdict", "")).lower() != want
    if intent.startswith("FACT_CHECK"):  # the label comes from the pair's FEVER metadata (see main)
        want = {"SUPPORTS": "true", "REFUTES": "false"}[chosen]
        return str(body.get("verdict", "")).lower() != want
    span, ans = gold_span(chosen), str(body.get("answer", "")).lower()
    if span is None:
        return not any(w in ans for w in ("not ", "no answer", "cannot", "doesn't", "does not"))
    norm = lambda x: " ".join("".join(c if c.isalnum() else " " for c in x.lower()).split())
    return norm(span) not in norm(ans)  # punctuation and encoding differences are not errors


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--intent", required=True)
    ap.add_argument("--capture", required=True)
    ap.add_argument("--pairs", required=True, help="the held-out test pairs the queries were drawn from")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    test = {json.loads(l)["prompt"]: json.loads(l) for l in open(a.pairs, encoding="utf-8")}
    miner = next(pathlib.Path(a.capture).glob("miner-*.json"))
    rows, n, errs = [], 0, 0
    for r in json.load(open(miner, encoding="utf-8"))["responses"]:
        t = test.get(r["query"])
        if not t or r.get("status") != 200:
            continue
        n += 1
        try:
            body = json.loads(r["body"])
        except (ValueError, TypeError, KeyError):
            continue
        if body.get("error"):
            errs += 1
            continue
        key = t.get("meta", {}).get("label") if a.intent.startswith("FACT_CHECK") else t["chosen"]
        if wrong(a.intent, body, key):
            rows.append(dict(prompt=r["query"], chosen=t["chosen"], rejected=r["body"], kind="livecert_wrong",
                             style="livecert_body", related_party=True))
    with open(a.out, "w", encoding="utf-8", newline="\n") as f:
        for x in rows:
            f.write(json.dumps(x, ensure_ascii=False) + "\n")
    print(f"{a.intent}: {n} answered, {errs} refused, {len(rows)} wrong -> {a.out}")


if __name__ == "__main__":
    main()
