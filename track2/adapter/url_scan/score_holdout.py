"""Score frozen pairs through the actual node executor and verify score identities."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import urllib.request
from tokenizers import Tokenizer


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pairs', type=Path)
    ap.add_argument('--url', required=True)
    ap.add_argument('--package', type=Path, required=True)
    ap.add_argument('--hash', required=True)
    ap.add_argument('--foundation', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    args = ap.parse_args()
    raw = args.package.read_bytes()
    header = json.loads(raw[8:8 + struct.unpack('<Q', raw[:8])[0]])['__metadata__']
    tokenizer_bytes = (args.foundation / 'tokenizer.json').read_bytes()
    assert hashlib.sha256(tokenizer_bytes).hexdigest() == header['tokenizer_hash']
    tok = Tokenizer.from_file(str(args.foundation / 'tokenizer.json'))
    tok.enable_truncation(max_length=int(header['max_tokens']))
    pairs = [json.loads(line) for line in args.pairs.read_text(encoding='utf-8').splitlines()]
    texts = list(dict.fromkeys((p['prompt'], p[key]) for p in pairs for key in ('chosen', 'rejected')))
    scored = {}
    truncated = 0
    for i, (prompt, answer) in enumerate(texts):
        ids = tok.encode(f'### Task:\n{prompt}\n\n### Answer:\n{answer}').ids
        truncated += len(ids) == int(header['max_tokens'])
        expected = {'foundation_hash': header['foundation_hash'], 'adapter_hash': args.hash.removeprefix('0x'),
                    'tokenizer_hash': header['tokenizer_hash']}
        body = json.dumps({'batch': [{'tokens': ids}], **expected}).encode()
        request = urllib.request.Request(args.url, body, {'Content-Type': 'application/json'})
        with urllib.request.urlopen(request, timeout=120) as response:
            reply = json.load(response)
        for key, value in expected.items():
            if reply.get(key) != value:
                raise ValueError(f'identity mismatch {key}')
        item = reply['results'][0]
        if 'error' in item:
            raise ValueError(item['error'])
        value = struct.unpack('<f', struct.pack('<I', item['score']))[0]
        if not math.isfinite(value):
            raise ValueError('nonfinite score')
        scored[(prompt, answer)] = {'bits': item['score'], 'float': value}
        if (i + 1) % 8 == 0:
            print(f'{i + 1}/{len(texts)} texts', flush=True)
    rows = []
    for pair in pairs:
        chosen = scored[(pair['prompt'], pair['chosen'])]
        rejected = scored[(pair['prompt'], pair['rejected'])]
        rows.append({'case': pair['case'], 'kind': pair['kind'], 'chosen': chosen, 'rejected': rejected,
                     'win': chosen['float'] > rejected['float'],
                     'comparator_win': pair['comparator_chosen'] > pair['comparator_rejected'],
                     'comparator_tie': pair['comparator_chosen'] == pair['comparator_rejected']})
    report = {'identity': expected, 'package_sha256': hashlib.sha256(raw).hexdigest(),
              'pairs_sha256': hashlib.sha256(args.pairs.read_bytes()).hexdigest(), 'rows': rows,
              'unique_texts': len(texts), 'texts_at_token_limit': truncated, 'max_tokens': int(header['max_tokens'])}
    report['summary'] = {kind: {'pairs': len(group), 'wins': sum(r['win'] for r in group),
                               'comparator_wins': sum(r['comparator_win'] for r in group)}
                         for kind in sorted({r['kind'] for r in rows})
                         for group in [[r for r in rows if r['kind'] == kind]]}
    args.out.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report['summary']))


if __name__ == '__main__':
    main()
