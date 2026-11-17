# EMAIL_SECURITY_GENERAL evaluation material (prepared 2026-11-16 UTC; DO NOT UPLOAD as is)

**Recommendation (Fable review, 2026-11-17): keep this as evidence; do not upload it.** It fails this entry's own
identity bar: 36 of 40 rejected answers come from one service (probe 0.954 against a bar of 0.65). A pool exists to
rank adapters, and these rows would teach "this service's format loses". Only 8 wrong answers from other services
exist to rebalance with, too few to fix that.

`EMAIL_SECURITY_GENERAL.jsonl`: 40 `preference_pair` rows, sha256
`897164b364a61d309da9bce68a81bb37660f4f49f8eb1852863860ac981020bd`. `node ../check-rows.mjs` reports
"OK: every row passes the published rules"; the closest two prompts are 77.8% similar (the node rejects at 85%).

## What the rows are

- **Real miner answers, none written by us.** They come from the 2026-11-16 capture of 9 services × 300 frozen
  queries (`../../adapter/email_security/`, G46). The label is the scored field `lookup_ok` (DNS status NOERROR or
  not). It comes from two public resolvers that are not miners in this family (NextDNS and DNS.SB), resolved before
  and after the capture; all 300 were stable.
- **Prompts.** The prompt is the plain question, "What are the {type} records for {name}?". `provenance.source_url`
  is the NextDNS lookup that settles the label, so the row counts as attested.
- **Selection.** Of the 65 one-per-query pairs, 25 were dropped because their prompts were ≥ 78% similar to a kept
  row (a seeded order, no model score).

## Disclose with the upload

- **One service dominates the wrong side.** 36 of 40 rejected answers come from telegraph-verity-intelligence, which
  reports NXDOMAIN as `lookup_ok: true`. That is a real, repeated error, but a scorer can learn the service's format
  from these rows. They add coverage of that error; they are not a balanced benchmark (G46: identity probe 0.954).
- **The champion's author is on the right side.** Many chosen answers come from zk-email-dns, owned by
  `0x8b224783…`, the author of champion #315.
- **No related party.** Our miner livecert does not serve EMAIL_SECURITY.

## Upload (the owner signs)

At https://anjoman.ai/dashboard/eval, verify `hyadav42774@gmail.com` and the wallet `0xdAd201ef…A39e`. Add material
under exactly `EMAIL_SECURITY_GENERAL`, check the body sha256 above, then sign. Afterwards, check
`/api/evalpool/submissions/mine?submitter=0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e&intent_id=EMAIL_SECURITY_GENERAL`
for the row states (`near_duplicate` against other contributors' rows is possible).
