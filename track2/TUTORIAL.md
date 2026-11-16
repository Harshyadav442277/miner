# Tutorial: check a Telegraph intent's miners against the truth, in about 15 minutes

Telegraph routes each request to the miner its evaluators rank highest for that intent. So the question an
evaluator must answer is "which miner is right?", measured on answers the evaluator's author did not write. This
tutorial does that for one intent, `EMAIL_SECURITY_GENERAL` (scored field `lookup_ok`: did the DNS lookup return
NOERROR). It uses only public endpoints. It needs no wallet, no API key and no payment.

**What you need:** Python 3.12 with PyYAML (`pip install pyyaml`), `curl`, and git. Windows, macOS and Linux all work.

**Cost and limits:** free. Each miner host is called at most once per second, with no auth headers, IPv4 only. The 3-query
pilot below makes about 75 requests and takes 1–3 minutes. Be polite: don't raise the rate.

## 1. Get the code and look at the intent

```bash
git clone https://github.com/Harshyadav442277/miner telegraph && cd telegraph
git checkout PR/cranky-euler-d201bb
curl -s https://devnode.telegraphprotocol.com/engine/v1/intents/EMAIL_SECURITY_GENERAL
```

The response lists the request params (`domain`, `record_type`), the scored response field (`lookup_ok`) and the
live miners. Each miner points to a YAML that says how to call it.

## 2. Freeze your questions before you see any answer

```bash
cd track2/harness
python freeze.py --verify ../adapter/email_security/holdout/pilot.freeze.json
```

The pilot (`pilot.json`) holds 3 real names from the Tranco list: one with records, one NOERROR-with-no-records and
one NXDOMAIN. Freezing first means you cannot pick questions after seeing who answers them well. To make your own,
write a JSON list of `{"id", "query", "params": {"domain", "record_type"}}` and run
`python freeze.py my.json --queries --family EMAIL_SECURITY --sources "..." --note "..."`.

## 3. Capture what every miner answers

```bash
python capture.py EMAIL_SECURITY_GENERAL ../adapter/email_security/holdout/pilot.json --out ../../my-capture --cap 200
```

Each miner gets its YAML-declared call, with `domain`/`record_type` mapped to its own parameter names (DoH resolvers
call them `name`/`type`). Every raw response is saved with its URL, status, timing and sha256 in
`my-capture/miner-<id>.json`.

## 4. Get the truth from DNS itself, then label

```bash
python -I ../adapter/email_security/dnstruth.py ../adapter/email_security/holdout/pilot.json --out ../../truth-before.jsonl
python -I ../adapter/email_security/dnstruth.py ../adapter/email_security/holdout/pilot.json --out ../../truth-after.jsonl
python -I ../adapter/email_security/build_holdout.py --queries ../adapter/email_security/holdout/pilot.json \
  --capture ../../my-capture --truth-before ../../truth-before.jsonl --truth-after ../../truth-after.jsonl \
  --out-dir ../../my-labels
```

The truth comes from two public resolvers that are not miners here (NextDNS, DNS.SB). A query counts only if both
agree, before and after the capture. Open `my-labels/labels.jsonl`: every answer is `right`, `wrong`, `call_failure`
or `ignores_query`, with the reason.

## 5. What to look for

- **NODATA is a success.** `lookup_ok` is true for NOERROR even when there are no records. In our full 300-query
  capture, one service reported 61 names that do not exist as `lookup_ok: true`. The 3-query pilot is too small to
  show it (our run on 2026-11-17: 40 right, 0 wrong, 8 call failures, 6 ignoring the query). Freeze 30+ queries
  with several NXDOMAIN names to see it yourself.
- **Underscore names (`_dmarc.`, `selector._domainkey.`) break some services**, which then answer HTTP 422.
- **Who is wrong matters as much as how often.** If every wrong answer comes from one service, a scorer can "win"
  by recognising that service's format. `my-labels/stats.json` prints an identity probe for that reason. Our gate
  refuses a holdout when that probe is above 0.65.

## 6. Optional: score real evaluator packages the way the node does

`measure.py` runs adapter packages in the node runtime (`adapterexec`) from Telegraph's evaluator kit. Fetch the
current champion with `python fetch_champion.py EMAIL_SECURITY` (its keccak is checked against the registry). Then
see [harness/README.md](harness/README.md) for `measure.py`, `compare.py` and `gate.py`. Without the kit, steps 1–5
still work.

## Troubleshooting

- **A curl hangs for 15 s:** IPv6 trouble. The harness forces IPv4; add `-4` to manual curls.
- **`REFUSED: ... freeze the queries first`:** capture runs only on a frozen query file. Run step 2.
- **`refused: non-public address`:** a miner YAML pointed at a private host, and `netguard` blocked it on purpose.
- **A miner returns 400 everywhere:** its YAML may omit something its API needs (Cloudflare's `/dns-query` needs an
  `accept: application/dns-json` header). That is the miner's declared call, not your setup.

Results, method and limits: [adapter/email_security/README.md](adapter/email_security/README.md), and GAPS G44–G50.
Found a wrong label or a bug? Open an issue with the exact query, the expected and actual label, and the command you
ran.
