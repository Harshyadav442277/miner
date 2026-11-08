"""Capture untouched public miner answers to frozen vendor warning-test URLs.

The catalog, each miner's YAML and its declared endpoint are untrusted third-party input:
every request goes through safe_fetch (https only, public addresses only, pinned DNS,
validated redirect hops, no argv injection) and output names are restricted to numeric ids.
"""
import concurrent.futures
import datetime as dt
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import urllib.parse
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from safe_fetch import METHODS, UnsafeURL, fetch, output_path  # noqa: E402

NODE = 'https://devnode.telegraphprotocol.com'
CASES = [
    ('google-phishing', 'https://testsafebrowsing.appspot.com/s/phishing.html', False, 'https://testsafebrowsing.appspot.com/'),
    ('google-malware', 'https://testsafebrowsing.appspot.com/s/malware.html', False, 'https://testsafebrowsing.appspot.com/'),
    ('google-unwanted', 'https://testsafebrowsing.appspot.com/s/unwanted.html', False, 'https://testsafebrowsing.appspot.com/'),
    ('microsoft-phishing', 'https://demo.smartscreen.msft.net/phishingdemo.html', False, 'https://demo.wd.microsoft.com/Page/UrlRep'),
    ('microsoft-malware', 'https://demo.smartscreen.msft.net/other/malware.html', False, 'https://demo.wd.microsoft.com/Page/UrlRep'),
    ('example-com', 'https://example.com/', True, 'https://www.iana.org/help/example-domains'),
    ('example-org', 'https://example.org/', True, 'https://www.iana.org/help/example-domains'),
    ('example-net', 'https://example.net/', True, 'https://www.iana.org/help/example-domains'),
]


def save(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')


def capture(miner, out):
    try:
        target_file = output_path(out, miner.get('id'))
    except UnsafeURL as exc:
        print('skipped miner with unsafe id:', repr(miner.get('id'))[:60], exc, flush=True)
        return
    record = {'id': miner['id'], 'slug': miner.get('slug'), 'related_party': miner.get('slug') == 'livecert'}
    try:
        record['yaml'] = fetch(miner['yaml_url'])
        doc = yaml.safe_load(record['yaml']['body'])
        if (doc.get('auth') or {}).get('type', 'none') != 'none':
            raise ValueError('requires authentication')
        matches = [e for e in doc.get('endpoints', [])
                   if any(i in ('URL_SCAN', 'URL_SCAN_VERDICT') for i in e.get('intents', []))]
        if len(matches) != 1:
            raise ValueError(f'{len(matches)} matching endpoints')
        endpoint = matches[0]
        base = doc.get('base_url', miner['base_url'])
        path = endpoint.get('external_path', endpoint['path'])
        if not path.startswith('/') or path.startswith('//'):
            raise ValueError('endpoint path must be relative')
        method = str(endpoint.get('method', 'GET')).upper()
        if method not in METHODS:
            raise ValueError('unsupported method')
        record['route'] = {'base': base, 'path': path, 'method': method}
        record['responses'] = []
        for name, url, expected, source in CASES:
            params = {'url': url}
            target = base.rstrip('/') + path
            if method == 'GET':
                target += ('&' if '?' in target else '?') + urllib.parse.urlencode(params)
            response = fetch(target, method, params if method == 'POST' else None)
            response['case'] = name
            record['responses'].append(response)
    except Exception as exc:
        record['error'] = str(exc)
    save(target_file, record)
    print(miner['id'], len(record.get('responses', [])), record.get('error', ''), flush=True)


if __name__ == '__main__':
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    if len(sys.argv) > 2 and sys.argv[2].endswith('.json'):
        # A cohort frozen beforehand by h2_cases.py: the cases file is copied, never edited.
        frozen = json.loads(Path(sys.argv[2]).read_text(encoding='utf-8'))
        CASES = [(c['case'], c['url'], c['expected_safe'], c['source']) for c in frozen]
    elif len(sys.argv) > 2:
        # Optional second cohort. Freeze before any calls; never select on miner scores.
        listed = Path(sys.argv[2]).read_bytes()
        domains = sorted(set(listed.decode().splitlines()),
                         key=lambda d: hashlib.sha256(('urlscan-holdout-v1:' + d).encode()).hexdigest())
        CASES = [(f'certpl-{i}', 'https://' + domain + '/', False,
                  'https://hole.cert.pl/domains/v2/domains.txt') for i, domain in enumerate(domains[:4])]
        CASES += [('example-' + suffix, f'https://example.{suffix}/', True,
                   'https://www.iana.org/help/example-domains') for suffix in ('com', 'org', 'net')]
        (out / 'certpl-domains.txt').write_bytes(listed)
    if (out / 'cases.json').exists():
        raise SystemExit('capture already frozen; choose a new evidence directory')
    save(out / 'cases.json', [{'case': n, 'url': u, 'expected_safe': s, 'source': p}
                             for n, u, s, p in CASES])
    if len(sys.argv) > 2 and sys.argv[2].endswith('.json'):
        (out / 'cases-frozen.json').write_bytes(Path(sys.argv[2]).read_bytes())  # sources are the r1 snapshot
    else:
        sources = {p: fetch(p, max_bytes=30000000) for _, _, _, p in CASES}
        save(out / 'sources.json', sources)
    raw = fetch(NODE + '/api/miners', max_bytes=30000000)
    save(out / 'catalog.json', raw)
    if raw['exit'] or raw['status'] != 200:
        raise SystemExit(f"catalog retrieval failed: {raw['error']}")
    miners = [m for m in json.loads(raw['body']) if 'URL_SCAN_VERDICT' in m.get('supported_intents', [])]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(lambda m: capture(m, out), miners))
