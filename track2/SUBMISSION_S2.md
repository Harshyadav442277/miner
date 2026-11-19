# Season II Evaluators entry: LiveCert evaluation work (draft, 2026-11-17)

Network: Telegraph devnode on Ethereum Sepolia. Nothing here is mainnet, paid demand or independent adoption. The
owner also runs the LiveCert miner. Every capture flags it as a related party, and it is never favoured.

**Network state changed on 2026-11-17 (observed 07:22 UTC).** The devnode reported `current_epoch: 0`, an empty
evaluator registry (`/api/wasm` count 0) and a miner list being re-registered. Registration id 4433, LiveCert's id
until then, belonged to another miner. Eval pools kept their rows. Every registry fact below (ids, champions, epochs,
pending registrations) is **as of 2026-11-16** unless dated otherwise. See §7 for the current state.

**What we claim:**
- a measurement method, and its results on six evaluator families;
- reference material for three intents;
- findings about live miners.

**What we do not claim:** a canonical adapter, a ranking change, or paid use of our material. None of those has
network evidence. The rules ask for exactly this distinction (§05, Evaluators): "Don't claim Canonical status, a
finalized ranking change, or paid material use without network evidence."

## 1. Project details (§08.01)

- **Team, contact:** LiveCert, `hyadav42774@gmail.com`; wallet `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`.
- **Track:** Evaluators.
- **Intents:**
  - measured: EMAIL_SECURITY, QUESTION_ANSWERING, WEATHER_FORECAST_VERIFY, VULNERABILITY_TRIAGE,
    OPTIMAL_EXECUTION_ROUTE, SANCTIONS_SCREENING_MATCH;
  - material: LANGUAGE_TRANSLATION_GENERAL (uploaded), and DNS_RECORD_LOOKUP_GENERAL and
    VALIDATOR_PERFORMANCE_VERIFY_GENERAL (truth sources, prepared);
  - comparators: FX_NOW, CRYPTO_PRICE, WEATHER_CHECK and six high-demand families.
- **Reviewer link:** https://github.com/Harshyadav442277/miner/tree/PR/cranky-euler-d201bb/track2 (this file is the
  entry point).
- **GitHub user who starred telegraphprotocol/bounties:** `Harshyadav442277`. *Owner action, not done as of
  2026-11-17.*

## 2. The method: a gate that can fail (`harness/`, ARCHITECTURE A7)

Our early adapters scored well on test sets we wrote and failed on answer shapes we had not written. The one we
registered was rejected at 7/15 on its remote check (G40). So no adapter of ours is registered unless
`harness/gate.py` prints PASS on a holdout that is:

1. frozen by hash before any answer is seen (`freeze.py`);
2. labelled from a primary source (DNS, NVD, GHCN, dataset gold);
3. scored in the node runtime (`measure.py`, the kit's `adapterexec`, f32 bits kept). The comparison is against the
   champion's own registered file (keccak checked against the registry), GENERIC, and the longer-answer and
   shorter-answer baselines;
4. judged by seven rules (`compare.py`, `gate.py`): ≥ 100 pairs; champion + 2 points; more candidate-only than
   champion-only wins; a Wilson lower bound ≥ 0.70; length baselines + 5 points; longer-wins itself ≤ 0.65; and
   P(pass a 30-pair round) ≥ 0.60.

Before each real-answer lane we also fixed a per-lane rule (`build_holdout.py` and its equivalents): **service
identity must not predict the label** (an identity-only probe ≤ 0.65). `gate.py` does not check it. It was measured
in two lanes (EMAIL_SECURITY 0.954, WEATHER 0.696) and estimated from pilots in two (VULNERABILITY_TRIAGE,
OPTIMAL_EXECUTION_ROUTE).

## 3. Results (§08.04 evidence). Every number is in the named file

| Intent | Champion (2026-11-16) | Our result | Why it stopped | Record |
|---|---|---|---|---|
| QUESTION_ANSWERING | #301, 70.0% (pool) | v1 42.0%, v2 43.4% on a frozen 362-pair holdout (300 TruthfulQA/HaluEval pairs + 62 miner pairs labelled by a model, 19 spot-checked); champion 45.3% | Gate FAIL on 6 rules, both iterations. No scorer beats shorter-answer-wins (51.7%), so this holdout cannot rank them | G42, G47 |
| EMAIL_SECURITY | #315, 71.4% | 300 frozen queries; 9 services × 300 = 2,700 responses (2,716 requests with retries): 1,834 right, 69 wrong, 197 call failures, 600 off-query | 61 of 69 wrong answers come from one service. 65 pairs, identity probe 0.954 | G46 |
| WEATHER_FORECAST_VERIFY | #445, 70.0% | 678 frozen queries | 56 pairs; identity probe 0.696, answer-shape probe 0.786 | G44 |
| VULNERABILITY_TRIAGE | #367, 79.3% | 480 frozen queries, 3-query pilot | On the one pilot CVE where NVD and the CNA differ, only the champion author's miner gave NVD's score | G45 |
| OPTIMAL_EXECUTION_ROUTE | #417, 73.3% | 126 real answers (one pair, one 6-minute window) | 0 wrong answers: every quote within 0.25% of the best public quote | G48 |
| SANCTIONS_SCREENING_MATCH | #375, 78.6% | v1–v6 adapters, 2 real-answer captures | Longer-answer-wins solves both captures (100%). #46 was rejected 7/15 | G40, G41 |

**The general result:**
- In four families, right and wrong split by service: EMAIL_SECURITY (61 of 69 wrong answers from one service),
  WEATHER, VULNERABILITY_TRIAGE and OPTIMAL_EXECUTION_ROUTE. A real-answer test there would reward recognising a
  service.
- In QUESTION_ANSWERING, both our candidates lost to the champion.
- In SANCTIONS, answer length alone separated the captured pairs.
- Our own training test splits passed every time and predicted nothing. The verbatim `gate.py` outputs are in G42
  and G47.

## 4. Findings about live miners, for judges and providers

These are direct calls to each miner's public service as its YAML declares, made on 2026-11-16. They are not the
engine route.

- **EMAIL_SECURITY.** One provider (telegraph-verity-intelligence) reports NXDOMAIN as `lookup_ok: true` ("The lookup
  completed successfully; the requested DNS name does not exist") on 61 of 300 frozen queries. It answers HTTP 422 to
  every underscore name (`_dmarc.*`, `_domainkey`): 116 of 116 (`adapter/email_security/evidence/2026-11-16/`).
- **VULNERABILITY_TRIAGE.** On the one pilot CVE where NVD and the CNA differ (CVE-2025-4250: NVD 9.8, CNA 7.3), 12
  miner registrations on one host (7 `nvd-cvss`, 5 `ghsa-cvss`) returned the CNA score. The schema asks for the NVD
  primary score. This is a 3-query pilot, so it is indicative only (`adapter/vulnerability_triage/`).
- **Comparator registrations were blocked (G49, as of 2026-11-16).** 45 comparator registrations in 30 families read
  `awaiting_compatible_material: ... no published snapshot`. After the reset the same holds for our #42–#47. Every
  family evaluated so far has non-`_GENERAL` intents (FX_NOW_*, CRYPTO_PRICE_USD, ...), and every waiting family's
  intent is `_GENERAL`. Our first guess, a family-id lookup, is contradicted: FX_NOW has no family-id snapshot and is
  still evaluated (2026-11-19). The cause is unknown and has been asked of the organisers.
- **Two deterministic intents went unscored (G50, as of 2026-11-16).**
  - DNS_RECORD_LOOKUP_GENERAL was last scored at epoch 2019 (2026-11-05 11:51 UTC); the cause is unknown. In that
    table the proxy-hosted and Cloudflare wrappers scored 0 and the direct dns.google wrappers 0.90–0.93. That may be
    call failures rather than a reference error.
  - VALIDATOR_PERFORMANCE_VERIFY_GENERAL was last scored at 2032. A DeFi yields source (val-llama-pools) scored 0.99
    while beacon-chain readers scored 0.19–0.38.

## 5. Contributions

- **The harness** (`harness/`: capture, freeze, measure, merge_results, compare, gate, netguard; 21 tests). It is
  reusable for any judgment family, and network inputs are treated as untrusted (`netguard.py`). A 15-minute walk-
  through is in [TUTORIAL.md](TUTORIAL.md).
- **The comparator pack** (`comparator/`): a 2,182-byte `no_std` Rust port of the network's `ReferenceScore`.
  - It agrees with the kit's rule on 234,848 node-runtime grid cases.
  - It agrees with the champions on a frozen 3,365-case adversarial suite, where six wrong mutants fail on 3–704
    cases each (`comparator/evaluation/`).
  - FX_NOW #267, CRYPTO_PRICE #268 and WEATHER_CHECK #269 passed the comparator gate and were superseded by
    identical-scoring registrations. An exact comparator can only tie, and the docs say "there is no 'better'
    comparator to build".
- **Material:**
  - **Uploaded, with network evidence:** `material/out/LANGUAGE_TRANSLATION_GENERAL.jsonl`. 144 rows uploaded on
    2026-11-04 by signer 0xdAd2…A39e. All 144 are `eligible` and `attested`
    (`/api/evalpool/submissions/mine?submitter=0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e&intent_id=LANGUAGE_TRANSLATION_GENERAL`,
    read 2026-11-17 07:22 UTC). **Related party:** our livecert served LANGUAGE_TRANSLATION_GENERAL (rank 12/22 on
    2026-11-16). Rows in a pool's ranking half can become the questions miners are asked, so these rows may score our
    own miner; they are dataset translations (Tatoeba), not livecert's answers. Two more rows from this wallet sit in
    STOCK_PRICE_US_EQUITY and WEATHER_CHECK_TEMPERATURE (146 in all, `/api/evalpool/submissions/mine`, 2026-11-19).
  - **Prepared for owner-signed upload:**
    - `material/dns_truth/`: DNS.SB and NextDNS truth sources for DNS_RECORD_LOOKUP_GENERAL. Related party: our
      livecert serves that intent and was unscored there, so it would be ranked if scoring resumed.
    - `material/validator_truth/`: a PublicNode Beacon REST truth source for VALIDATOR_PERFORMANCE_VERIFY_GENERAL.
  - **Kept as evidence, deliberately not uploaded:** the 40 EMAIL_SECURITY real-answer pairs
    (`material/email_security/`). 36 of the 40 rejected answers come from one service, which fails our own identity
    bar. Upload them only if they can be balanced.

## 6. How to run it (§08.03)

The quick path needs no kit, key or wallet: [TUTORIAL.md](TUTORIAL.md) (capture, DNS truth and labels on 3 frozen
queries in about 15 minutes; our run on 2026-11-16 UTC: 54 answers). The full re-score in the node runtime needs the
tg-eval venv with `tokenizers` and the kit `telegraph-wasm-baseline` at `992f2650` for `adapterexec`:

```bash
cd track2/harness
python -m unittest test_harness                 # 21 tests
python freeze.py --verify ../adapter/email_security/holdout/queries.freeze.json
C:/Users/hyada/tg-eval/.venv/Scripts/python.exe measure.py \
  --package champion=C:/Users/hyada/tg-eval/champions/EMAIL_SECURITY/315.safetensors \
  --pairs r1=../adapter/email_security/evidence/2026-11-16/holdout.jsonl --out results.json
```

Expected: champion 48/65 = 0.7385 on `r1` (`evidence/2026-11-16/measure-champion.json`). `fetch_champion.py` needs the
live registry. After the 2026-11-17 reset it lists no modules, so use the files already fetched (keccak recorded in
G46).

- **Cost:** none on the network. CPU and GPU time is local.
- **Known limits:**
  - how the hidden pool renders a request is unknown (G43);
  - captures call each miner's public service directly, not the engine route;
  - labels read by a model are marked as such.

## 7. Status of owner actions (fill in before submitting)

| Action | State | Network evidence to attach |
|---|---|---|
| Star telegraphprotocol/bounties | not done | the GitHub username |
| LANGUAGE_TRANSLATION material | **done 2026-11-04** | 144 rows eligible, attested (see §5) |
| DNS truth upload | not done | row state; DNS_RECORD_LOOKUP scores at an epoch after the upload |
| Validator truth upload | not done | row state; VALIDATOR_PERFORMANCE_VERIFY scores at an epoch after the upload |
| Organiser report (`material/ORGANISER_REPORT.md`) | not sent | the link to the message or issue |
| Demo video (2–5 min) | built locally (`demo/make_video.py`), not published | the video link |
| Three dated public updates (growth) | drafts in `OUTREACH_S2.md` | the links |

## 8. Public summary (§08.05), for after the uploads

> We built a gate that refuses to register an evaluator unless it beats the champion on real miner answers labelled
> from primary sources. In four families, right and wrong answers split by service, so a real-answer test would have
> rewarded recognising a service. In QUESTION_ANSWERING, our two candidates lost to the champion. We publish the
> method, the failures and the miner errors we found: non-existent DNS names reported as successful lookups, and a CNA
> score served where NVD's is required. We also contributed attested translation material and neutral truth sources
> for two unscored intents. Try it in 15 minutes: `track2/TUTORIAL.md` in the LiveCert repository.

## 9. Showcase permission (§08.06)

The owner decides. Default proposal: all text, tables and code public; no buyer introductions.
