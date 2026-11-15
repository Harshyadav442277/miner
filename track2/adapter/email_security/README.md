# EMAIL_SECURITY adapter lane

Status 2026-11-15 (UTC): **holdout being built. Nothing trained, nothing registered.**

Family `EMAIL_SECURITY`, intent `EMAIL_SECURITY_GENERAL`, class judgment (read live 2026-11-15 ~19:57 UTC from
`/engine/v1/intents/EMAIL_SECURITY_GENERAL`). Request `domain` and `record_type`. One response field, scored:
`lookup_ok` (bool), "Whether the DNS {type} lookup for {name} succeeded: DNS Status 0 (NOERROR) means yes, any
other status means no". Champion #315 (author `0x8b224783…`, eval_score 0.7143 on 28 pairs), file
`C:/Users/hyada/tg-eval/champions/EMAIL_SECURITY/315.safetensors`: keccak `3aaa612c…6496` matches the registry,
header rank 8, alpha 32, max_tokens 384. Pool: 651 eligible rows from 10 submitters (`/api/evalpool/status`,
snapshot `b40c2c48…`); not public.

## The 19 miners (live list, 2026-11-15)

- 11 are public DoH resolvers: `dns.google` ×8 (56001–56008, the same URL), `cloudflare-dns.com` ×2 (56009, 56010),
  AdGuard (190120), AliDNS (190121), DNSPod (190122). Their YAMLs declare `name`/`type`. Several are named for one
  fixed name (e.g. "Google DoH Gmail DMARC") but call the resolver with whatever name they are given.
- zk-email-dns (772354) and guardwire-email-security (7354) are owned by `0x8b224783…`, **the champion's author**.
  7354's YAML declares no endpoint for this intent.
- Generic multi-intent services: telegraph-verity-intelligence (5530, POST), txlens (9002), chainsight-oracle
  (302), a1-preflight (20260828).
- None is ours (no `livecert`, no `0xdAd2…` wallet). No LiveCert pairs exist.

## Gating choices, fixed before any query was frozen or any answer seen

1. **Queries.** Real registrable domains from the Tranco list `947V2` (generated 2026-11-14,
   https://tranco-list.eu/list/947V2, zip sha256 `b5722de4…a2d5`; the site asks users to cite its paper).
   - Every domain is bucketed by sha256("es-split-v1:" + domain) mod 100: 0–9 holdout, 10 pilot, 11–99 training.
     The training builder must refuse any domain listed in `holdout/holdout_domains.txt` (buckets 0–10).
   - Rank bands 1–1k, 1k–10k, 10k–100k, 100k–1M. One query per holdout domain. Names come from
     email-security templates: apex MX/TXT/CAA/NS/SOA/A/AAAA, `_dmarc`, DKIM selectors under `_domainkey`,
     `_mta-sts`, `_smtp._tls`, SRV for submission/IMAPS/autodiscover, `mail.`, `www.` MX, `autodiscover.` CNAME,
     and a seeded random label (which should not exist) under the real domain (`make_queries.py`).
   - Selection is balanced on a truth pre-check: about half `lookup_ok` true and half false, spread over
     record types. The plain-language `query` is "What are the {type} records for {name}?".
2. **Truth.** Two validating public resolvers that are **not miners in this family**: NextDNS and DNS.SB, DoH
   JSON over HTTP/1.1 (`dnstruth.py`; Quad9 refused HTTP/1.1). A query's truth is the Status both agree on.
   Truth is resolved just before and just after the capture, and raw responses are kept. A query is dropped
   when the resolvers disagree or the status changed between the two checks.
3. **Label rule (on `lookup_ok` only).** An answer is **right** when it addresses the requested name and record
   type and its claimed lookup outcome equals the truth: NOERROR, with or without records, is `true`; NXDOMAIN,
   SERVFAIL, REFUSED and the rest are `false`. It is **wrong** when it claims the opposite outcome or answers a
   different name or type. Record-content errors (a wrong MX host with the right status) are recorded as a
   report-only `kind`, not used to label. An answer whose outcome cannot be read is `unclear` and is not gated.
   - DoH JSON (`Status`, `Question`) and structured `lookup_ok` answers are read mechanically.
   - Free-text answers are read by a model against this rule and recorded with the reader's note. The model sees
     no adapter score.
4. **Not gated (report-only file):** transport failures, HTTP ≥ 400, empty bodies, and error pages that our call
   shape may cause (for example Cloudflare's `/dns-query` without an `accept: application/dns-json` header, which
   the YAML does not declare). These are real responses to the YAML-declared call, but they may be our artefact.
5. **Pairs.** One pair per query in the gated set: chosen = a right answer, rejected = a wrong answer to the
   same query.
   - The pair is picked by a mechanical seeded rule, never by any model score. It prefers pairs where both
     answers come from non-resolver services, then the pair that moves the running longer-chosen share toward
     0.5, then the pair that moves each service's chosen share toward 0.5, then a sha256 tie-break.
   - Identical miners (the eight `dns.google` entries) count as one service.
6. **Shortcut bars, set now.** Longer-wins ≤ 0.65 (gate rule 6), shorter-wins ≤ 0.65, and an identity-only probe
   ≤ 0.65. The probe predicts the side whose service has the higher right-rate on all other queries
   (leave-one-query-out). **If both bars cannot be met with ≥ 100 gated pairs, the lane stops and reports. It
   does not train.**
7. **Champion's author.** Pairs that use zk-email-dns or guardwire carry `champion_author: true`. The
   champion's accuracy is reported with and without them.
8. **Prompt rendering.** How pool rows render a request is not public (GAPS G43). Gated rows use
   `What are the {type} records for {name}?\nRequest: {"domain": "{name}", "record_type": "{type}"}`. A
   report-only copy of the same pairs uses the bare request JSON, so a rendering effect shows up as a
   difference between the two.
9. **Stop rule.** If champion #315 scores above about 85% on the gated holdout, the family is not an opening.
   The lane stops and reports before any training.

## Files

| File | What |
|---|---|
| `make_queries.py` | candidates from Tranco, then the truth-balanced selection; writes `holdout/queries.json`, `holdout/pilot.json`, `holdout/holdout_domains.txt` |
| `dnstruth.py` | DNS truth from NextDNS + DNS.SB, resumable |

Bulk data lives in `C:/Users/hyada/tg-eval/data/email_security/` (Tranco, candidates, truth) and
`C:/Users/hyada/tg-eval/captures/es-*` (miner captures).
