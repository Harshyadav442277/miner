"""Freeze decision-only pairs from complete unchanged miner replies."""
import argparse
import hashlib
import json
from pathlib import Path

SAFE = {'safe', 'clean', 'benign', 'secure', 'allow', 'allowed'}
UNSAFE = {'unsafe', 'malicious', 'phishing', 'malware', 'suspicious', 'block', 'blocked', 'dangerous'}


def verdict(doc):
    votes = []
    for key in ('safe', 'is_safe'):
        if isinstance(doc.get(key), bool):
            votes.append(doc[key])
    for key in ('verdict', 'status', 'classification'):
        value = str(doc.get(key, '')).lower().strip()
        if value in SAFE | UNSAFE:
            votes.append(value in SAFE)
    for key in ('data', 'result'):
        if isinstance(doc.get(key), dict):
            nested = verdict(doc[key])
            if nested is not None:
                votes.append(nested)
    return votes[0] if votes and all(v == votes[0] for v in votes) else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('capture', type=Path)
    args = ap.parse_args()
    cases = json.loads((args.capture / 'cases.json').read_text(encoding='utf-8'))
    case_urls = {c['case']: c['url'] for c in cases}
    by_case = {c['case']: [] for c in cases}
    audit = []
    for path in sorted(args.capture.glob('miner-*.json')):
        miner = json.loads(path.read_text(encoding='utf-8'))
        for response in miner.get('responses', []):
            record = {'miner': miner['id'], 'case': response['case'], 'sha256': response['sha256']}
            try:
                if response['status'] != 200 or response['exit']:
                    raise ValueError('transport error')
                doc = json.loads(response['body'])
                if not isinstance(doc, dict):
                    raise ValueError('not an object')
                if doc.get('error'):
                    raise ValueError('service error')
                target = doc.get('url') or doc.get('target')
                if isinstance(target, str) and target.rstrip('/') != case_urls[response['case']].rstrip('/'):
                    raise ValueError('response identifies another target')
                value = verdict(doc)
                if value is None:
                    raise ValueError('missing or conflicting verdict')
                record['safe'] = value
                if not miner['related_party']:
                    by_case[response['case']].append((miner['id'], value, response['body']))
                else:
                    record['excluded'] = 'related party'
            except (ValueError, TypeError) as exc:
                record['abstain'] = str(exc)
            audit.append(record)
    pairs = []
    coverage = []
    for case in cases:
        correct = [r for r in by_case[case['case']] if r[1] == case['expected_safe']]
        incorrect = [r for r in by_case[case['case']] if r[1] != case['expected_safe']]
        # Fixed cap controls runtime. It is applied before model scores are read.
        for good in correct[:2]:
            for bad in incorrect[:2]:
                pairs.append({'prompt': f"Is {case['url']} safe to open?", 'chosen': good[2],
                              'rejected': bad[2], 'chosen_miner': good[0], 'rejected_miner': bad[0],
                              'kind': 'decision', 'case': case['case'], 'expected_safe': case['expected_safe'],
                              'comparator_chosen': 10000, 'comparator_rejected': 0})
        # Construct a wrong-query control from an untouched answer for another URL.
        # Both verdicts remain correct, so the boolean comparator ties.
        for good in [r for r in correct if case['url'] in r[2]][:2]:
            alternatives = [r for other in cases if other['case'] != case['case']
                            and other['expected_safe'] == case['expected_safe']
                            for r in by_case[other['case']] if r[1] == case['expected_safe']
                            and other['url'] in r[2] and case['url'] not in r[2]]
            if alternatives:
                bad = alternatives[0]
                pairs.append({'prompt': f"Is {case['url']} safe to open?", 'chosen': good[2],
                              'rejected': bad[2], 'chosen_miner': good[0], 'rejected_miner': bad[0],
                              'kind': 'constructed_wrong_query', 'case': case['case'],
                              'expected_safe': case['expected_safe'],
                              'comparator_chosen': 10000, 'comparator_rejected': 10000})
        coverage.append({'case': case['case'], 'correct': len(correct), 'incorrect': len(incorrect)})
    body = ''.join(json.dumps(p) + '\n' for p in pairs).encode()
    (args.capture / 'pairs.jsonl').write_bytes(body)
    (args.capture / 'labels.json').write_text(json.dumps({'coverage': coverage, 'rows': audit,
            'pairs': len(pairs), 'pairs_sha256': hashlib.sha256(body).hexdigest()}, indent=2), encoding='utf-8')
    print(json.dumps({'pairs': len(pairs), 'coverage': coverage}))


if __name__ == '__main__':
    main()
