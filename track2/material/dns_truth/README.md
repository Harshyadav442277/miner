# DNS_RECORD_LOOKUP_GENERAL truth sources (prepared 2026-11-16, NOT uploaded)

**Why:** the intent has been unranked since epoch 2019 (2026-11-05; GAPS G50). The docs say a deterministic
intent with no readable reference "is not ranked that epoch: its miners keep their previous ranking". Its last table
(epoch 2019) scored the honest Cloudflare, DNS.SB and NextDNS resolver wrappers 0 and the champion author's guardwire
0.99. That looks like a wrong reference. A truth source is evaluation material: it registers nothing, is never routed
and is never paid (anjoman.ai/docs/scoring/contribute-evaluation-data, read 2026-11-16).

**What:** `DNS_RECORD_LOOKUP_GENERAL.truth.jsonl`, two rows in the documented shape
`{"label_kind":"truth_source","source":"<miner-format YAML>"}`. It is 2,512 bytes, sha256
`ccc8e992cb407cdb2fe8c832763835aac5d67a116ad9ad192a78b8f9d2d60123`. The YAMLs are `dnssb.yaml` and `nextdns.yaml`:

- **Public resolvers we do not run, and not the hosts the existing wrapper miners use.** DNS.SB
  (`https://doh.dns.sb/dns-query`) and NextDNS (`https://dns.nextdns.io/dns-query`): keyless, `auth.type: none`,
  DNSSEC-validating.
- **Both answer DoH JSON to a plain GET with no header** (checked 2026-11-16). They are the same two resolvers the
  EMAIL_SECURITY lane used as truth: 300/300 names stable before and after a capture (G46).
- **How the node reads them.** The node reads the value "with the node's response parser and the intent's answer
  format". Without an `intent_mapping`, that is the parser model reading the whole answer. Each YAML's description
  states the rule: NOERROR with at least one Answer record of the type is true; anything else is false.

## Related party: disclose this

Our miner `livecert` (#4433) serves DNS_RECORD_LOOKUP. A truth source sets the reference every miner in the intent is
scored against, ours included. These sources are neutral public resolvers, not anything we host, so they cannot favour
livecert. Disclose it anyway in the upload note and the submission. Never replace them with a wrapper we deploy.

## Limits (unverified)

- **The node's parser model may misread an answer.** The risk cases are CNAME chains (an MX query on a CNAME returns
  the CNAME in Answer) and NODATA. The node's parser cannot be tested from here.
- **The node places each row in the ranking or the testing half, and the contributor cannot choose.** Sources in the
  testing half are not used, so either row may do nothing.
- **The node takes the median of up to 3 sources.** A wrong source already in the pool still counts as one of them.
  Two good rows improve the odds; they do not guarantee anything.
- **There was no pre-check.** The validation API answers 404 (its own docs page says so). A bad YAML comes back with a
  rejection code (`source_unparseable`, `source_no_endpoint` and so on); the cost is one signature.
- **Why scoring stopped at epoch 2019 is not known.**

## Upload (the owner signs; Claude never touches the key)

1. Sign in at https://anjoman.ai/dashboard/eval. Verify `hyadav42774@gmail.com` and the LiveCert wallet
   `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`.
2. Add material under exactly `DNS_RECORD_LOOKUP_GENERAL` and upload `DNS_RECORD_LOOKUP_GENERAL.truth.jsonl`.
   Check that the body sha256 is the one above, then sign the `Telegraph eval-pool submission v1` message.
3. Note the response: row states, rejection codes, the epoch.

## How we would know it worked (network evidence only)

- `GET /api/evalpool/status?intent_id=DNS_RECORD_LOOKUP_GENERAL`: our rows show `eligible`, and a later snapshot
  publishes.
- `GET /api/miners`: the DNS_RECORD_LOOKUP_GENERAL scores carry an `epoch_id` after the upload epoch, where it is
  2019 today.
- Until both show, nothing may be claimed. Not a ranking change, not "the intent is fixed".
