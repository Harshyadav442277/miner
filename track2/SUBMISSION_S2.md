# Season II Evaluators entry: LiveCert evaluation work (draft, 2026-11-16)

Network: Telegraph devnode on Ethereum Sepolia. Nothing here is mainnet, paid demand or independent adoption. The
owner also runs the LiveCert miner (#4433). Every capture flags it as a related party, and it is never favoured.

**What we claim:** a measurement method, its results on nine intent families, reference material, and findings
about live miners. **What we do not claim:** a canonical adapter, a ranking change, or paid use of our material.
None of those has network evidence. The rules ask for exactly this distinction (§05, Evaluators): "Don't claim
Canonical status, a finalized ranking change, or paid material use without network evidence."

## 1. Project details (§08.01)

- **Team, contact:** LiveCert, `hyadav42774@gmail.com`; wallet `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`.
- **Track:** Evaluators.
- **Intents:**
  - EMAIL_SECURITY, QUESTION_ANSWERING, WEATHER_FORECAST_VERIFY, VULNERABILITY_TRIAGE, OPTIMAL_EXECUTION_ROUTE and
    SANCTIONS_SCREENING_MATCH: measurements;
  - DNS_RECORD_LOOKUP_GENERAL and VALIDATOR_PERFORMANCE_VERIFY_GENERAL: truth-source material;
  - FX_NOW, CRYPTO_PRICE, WEATHER_CHECK and six high-demand families: comparators.
- **Reviewer link:** the repository's `track2/` folder (this file is the entry point).
- **GitHub user who starred telegraphprotocol/bounties:** `Harshyadav442277`. *Owner action, not done as of
  2026-11-16.*

## 2. The method: a gate that can fail (`harness/`, ARCHITECTURE A7)

Three early adapters scored 90%+ on test sets we wrote and failed on the network. One was rejected at 7/15 on its
remote check (G40). So no adapter of ours is registered unless `harness/gate.py` prints PASS on a holdout that is:

1. made of real miner answers we did not write, captured from each miner's public service (`capture.py`). The
   capture fills the intent's request fields by name, alias or URL path, as each miner's YAML declares them;
2. labelled from a primary source (DNS, NVD, GHCN, dataset gold), with queries frozen by hash before any answer is
   seen (`freeze.py`);
3. scored in the node runtime (`measure.py`, the kit's `adapterexec`, f32 bits kept) against the champion's own
   registered file (keccak checked against the registry), GENERIC, and the longer-answer and shorter-answer
   baselines;
4. judged by seven rules: ≥ 100 pairs; champion + 2 points; more candidate-only than champion-only wins; a Wilson
   lower bound ≥ 0.70; length baselines + 5 points; longer-wins itself ≤ 0.65; P(pass a 30-pair round) ≥ 0.60
   (`compare.py`, `gate.py`).

We added one rule before each new lane: **service identity must not predict the label** (an identity-only probe
≤ 0.65). That rule stopped four lanes.

## 3. Results (§08.04 evidence). Every number is in the named file

| Intent | Champion | Our result | Why it stopped | Record |
|---|---|---|---|---|
| QUESTION_ANSWERING | #301, 70.0% (pool) | v1 42.0%, v2 43.4% on a frozen 362-pair holdout; champion 45.3% there | Gate FAIL on 6 rules, both iterations. The pairs turn on world facts a base-size reward head does not hold | G42, G47 |
| EMAIL_SECURITY | #315, 71.4% | 300 frozen queries, 2,716 real answers, 69 wrong | 61 of 69 wrong answers come from one service. 65 pairs, identity probe 0.954 | G46 |
| WEATHER_FORECAST_VERIFY | #445, 70.0% | 678 frozen queries | 56 pairs; identity probe 0.696, answer-shape probe 0.786 | G44 |
| VULNERABILITY_TRIAGE | #367, 79.3% | 480 frozen queries, 3-query pilot | Where CNA ≠ NVD, only the champion author's miner is right | G45 |
| OPTIMAL_EXECUTION_ROUTE | #417, 73.3% | 126 real answers | 0 wrong answers: every quote within 0.25% of the best public quote | G48 |
| SANCTIONS_SCREENING_MATCH | #375, 78.6% | v1–v6 adapters, 2 real-answer captures | Longer-answer-wins solves both captures (100%). #46 was rejected 7/15 | G40, G41 |

**The general result:** on these intents, live miners' wrong answers come from one to three services. A test set
built from real answers can then reward recognising a service rather than checking an answer. Where pairs do turn on
content (QA), a base-size reward head with a rank-8 adapter lacks the facts. Our own training test splits passed every
time and predicted nothing. The verbatim `gate.py` outputs are in G42 and G47.

## 4. Findings about live miners, for judges and providers

- **telegraph-verity-intelligence on EMAIL_SECURITY** reports NXDOMAIN as `lookup_ok: true` ("The lookup completed
  successfully; the requested DNS name does not exist"). It did so on 61 of 300 frozen queries. It also answers HTTP
  422 to every underscore name (`_dmarc.*`, `_domainkey`), 116 of 116 (`adapter/email_security/evidence/2026-11-16/`).
- **VULNERABILITY_TRIAGE:** 12 NVD-labelled miners return the CNA's CVSS score, not the NVD primary score the schema
  asks for. Example: CVE-2025-4250, where NVD has 9.8 and the CNA 7.3 (`adapter/vulnerability_triage/`, a
  3-query pilot).
- **Comparator registrations are blocked (G49).** About 30 comparator registrations read `awaiting_compatible_material:
  ... no published snapshot`. The snapshot exists under the `_GENERAL` intent id but is looked up under the family id.
  This is inferred from `/api/wasm` and `/api/evalpool/status`. It affects our #273–#278 and other authors' entries.
- **Two deterministic intents are unranked (G50).** DNS_RECORD_LOOKUP_GENERAL was last scored at epoch 2019 and
  VALIDATOR_PERFORMANCE_VERIFY_GENERAL at 2032. Their last tables look like a wrong reference: the honest resolvers
  and beacon readers scored 0–0.38.

## 5. Contributions

- **The harness** (`harness/`: capture, freeze, measure, merge_results, compare, gate, netguard; 21 tests). It is
  reusable for any judgment family, and network inputs are treated as untrusted (`netguard.py`).
- **The comparator pack** (`comparator/`): a 2,182-byte `no_std` Rust port of the network's `ReferenceScore`.
  - It agrees with the kit's rule on 234,848 node-runtime grid cases.
  - It agrees with the champions on a frozen 3,365-case adversarial suite, where six wrong mutants fail on 3–704
    cases each (`comparator/evaluation/`).
  - FX_NOW #267, CRYPTO_PRICE #268 and WEATHER_CHECK #269 passed the comparator gate and were superseded by
    identical-scoring registrations. An exact comparator can only tie, and the docs say "there is no 'better'
    comparator to build".
- **Material, prepared for owner-signed upload. Nothing is uploaded unless §7 says so.**
  - `material/dns_truth/`: DNS.SB and NextDNS truth sources for DNS_RECORD_LOOKUP_GENERAL. Our livecert serves that
    intent, and this is disclosed.
  - `material/validator_truth/`: a PublicNode Beacon REST truth source for VALIDATOR_PERFORMANCE_VERIFY_GENERAL.
  - `material/out/LANGUAGE_TRANSLATION_GENERAL.jsonl`: 144 Tatoeba-based preference pairs. Whether it was signed
    is not verified.
  - The 65 DNS-labelled EMAIL_SECURITY real-answer pairs (`adapter/email_security/evidence/2026-11-16/holdout.jsonl`),
    which catch verity's NXDOMAIN error.

## 6. How to run it (§08.03)

Prerequisites: Windows or Linux, Python 3.12, the tg-eval venv with `tokenizers`, and the kit
`telegraph-wasm-baseline` at `992f2650` for `adapterexec`. No key or wallet. Every network call is a public GET.

```bash
cd track2/harness
python -m unittest test_harness                 # 21 tests
python registry.py champion EMAIL_SECURITY      # live champion, keccak
python fetch_champion.py EMAIL_SECURITY         # downloads #315, refuses on a keccak mismatch
python freeze.py --verify ../adapter/email_security/holdout/queries.freeze.json
# re-score the EMAIL_SECURITY report-only pairs in the node runtime (~8 min on CPU)
C:/Users/hyada/tg-eval/.venv/Scripts/python.exe measure.py \
  --package champion=C:/Users/hyada/tg-eval/champions/EMAIL_SECURITY/315.safetensors \
  --pairs r1=../adapter/email_security/evidence/2026-11-16/holdout.jsonl --out results.json
```

Expected: champion 48/65 = 0.7385 on `r1` (`evidence/2026-11-16/measure-champion.json`).

- **Cost:** none on the network. CPU and GPU time is local.
- **Known limits:**
  - how the hidden pool renders a request is unknown (G43);
  - each capture calls a miner's public service directly, not through the paid engine route;
  - labels read by a model are marked as such.

## 7. Status of owner actions (fill in before submitting)

| Action | State | Network evidence to attach |
|---|---|---|
| Star telegraphprotocol/bounties | not done | the GitHub username |
| DNS truth upload | not done | row state; DNS_RECORD_LOOKUP scores at an epoch after the upload |
| Validator truth upload | not done | row state; VALIDATOR_PERFORMANCE_VERIFY scores at an epoch after the upload |
| Organiser report (`material/ORGANISER_REPORT.md`) | not sent | the link to the message or issue |
| Demo video (2–5 min) | not recorded | |
| Three dated public updates (growth) | see `OUTREACH_S2.md` | the links |

## 8. Public summary (§08.05), for after the uploads

> We built a gate that refuses to register an evaluator unless it beats the champion on real miner answers,
> labelled from primary sources. On six intents, real answers showed that miners' mistakes cluster in one to three
> services, so no honest real-answer test could crown a new evaluator. We publish the method, the failures, and
> the bugs we found: one provider reports non-existent DNS names as successful lookups, twelve vulnerability
> miners serve the CNA score instead of NVD's, and two intents had gone unranked, for which we contributed neutral
> truth sources. Try it: `track2/harness/` in the LiveCert repository.

## 9. Showcase permission (§08.06)

The owner decides. Default proposal: all text, tables and code public; no buyer introductions.
