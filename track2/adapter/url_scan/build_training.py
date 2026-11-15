"""Build an exploratory evidence-consistency adapter set, separate from miner answers."""
import argparse
import hashlib
import json
from pathlib import Path
import random


def build(split, size):
    rng = random.Random(f"urlscan-v1-{split}")
    rows = []
    for i in range(size):
        key = hashlib.sha256(f"{split}-{i}".encode()).hexdigest()[:20]
        path = rng.choice(['help', 'download', 'session', 'news'])
        url = f"https://{key}.example.org/{path}"
        safe = i % 2 == 0
        evidence = rng.choice([
            "The supplied scan found a static document and no active content or redirects.",
            "The supplied scan found no threat indicators in the fetched resource.",
            "The supplied scan reports a clean result for this exact URL.",
        ] if safe else [
            "The supplied scan found an active phishing credential collection form.",
            "The supplied scan found a malware payload at the final destination.",
            "The supplied scan reports a blocked threat for this exact URL.",
        ])
        prompt = f"Assess whether {url} is safe to open using this observation. {evidence}"
        other = f"https://{key[::-1]}.example.org/{path}"
        kind = i % 3
        bad_url, bad_safe = (other, safe) if kind == 0 else (url, not safe)
        fmt = rng.randrange(4)

        def answer(target, verdict):
            if fmt == 0:
                return json.dumps({"url": target, "safe": verdict, "evidence": evidence})
            if fmt == 1:
                return f"URL {target}. Safe to open: {'yes' if verdict else 'no'}. {evidence}"
            if fmt == 2:
                return f"For {target}, the verdict is {'safe' if verdict else 'unsafe'}. {evidence}"
            return json.dumps({"target": target, "verdict": 'safe' if verdict else 'unsafe', "reason": evidence})

        rows.append({"prompt": prompt, "chosen": answer(url, safe),
                     "rejected": answer(bad_url, bad_safe), "kind": "wrong_url" if kind == 0 else "verdict"})
    return rows


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('out', type=Path)
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    manifest = {"purpose": "synthetic training only, never pool material", "files": {}}
    for split, size in [('train', 768), ('val', 96), ('test', 96)]:
        body = ''.join(json.dumps(row) + '\n' for row in build(split, size)).encode()
        (args.out / f'{split}.jsonl').write_bytes(body)
        manifest['files'][split] = {"rows": size, "sha256": hashlib.sha256(body).hexdigest()}
    (args.out / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
