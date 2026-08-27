# livecert — live TLS certificate verification miner

A Telegraph miner for the **`SSL_VERIFICATION`** intent. It performs a real TLS
handshake against the target host and reports what that server is serving *right now*.

## Why a handshake, and not a CT lookup

The incumbent `certspotter-cert-verification` miner answers from certificate-transparency
logs. CT tells you what was **issued** for a domain; it cannot tell you what the server has
**deployed**. A host still serving an expired certificate while a fresh one sits in CT is
exactly the case this intent is asked about, and only a live handshake sees it.

## Endpoint

```
GET /ssl-check?domain=example.com
```

Also accepts `host`, `hostname`, `url`, or `query`. Handles `https://example.com/path`
and `example.com:8443`. `GET /health` is a liveness probe that does no outbound work.

### Verdicts

`valid` · `expired` · `not_yet_valid` · `hostname_mismatch` · `self_signed` · `untrusted` · `unreachable`

`self_signed` means the leaf itself is self-signed; a self-signed *root* in the chain is
`untrusted`, which is a different fact about a different certificate.

## Run locally

```bash
npm install && npm run build && npm start
curl "http://127.0.0.1:8080/ssl-check?domain=expired.badssl.com"
```

## Test

```bash
npm test
```

23 tests: unit coverage of the target parser, plus live checks against badssl.com asserting every
verdict path. The live ones need network access and are deliberately not mocked — they are what
actually proves the verdict logic.

## Deploy

```bash
fly launch --no-deploy --copy-config --name livecert
fly deploy
```

`min_machines_running = 1` in `fly.toml` is load-bearing: spot checks run every ~20s and
routing is revoked on a 20% score drop, so a cold start reads as a failure.

## Design notes

- **Zero runtime dependencies** — Node standard library only. Nothing to break, small image, fast start.
- **60s response cache** — never longer than the spot-check interval, so a verdict cannot go stale between checks.
- **8s handshake timeout** — a slow host fails fast as `unreachable` rather than hanging a spot check.
- **Terse `reason` text** — scoring compares the answer against a ground-truth *string*, and
  padding with words the ground truth lacks dilutes the overlap.
