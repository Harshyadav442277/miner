# Season II Evaluators entry: LiveCert evaluation work (rewritten 2026-11-26)

Network: Telegraph devnode on Ethereum Sepolia. Nothing here is mainnet, paid demand or independent adoption. The
owner also runs the LiveCert miner. Every capture flags it as a related party, and it is never favoured.

**What we claim, with network evidence:**
- **#210 is the canonical CONTRACT_OBLIGATION_AUDIT evaluator**, the family's first. The node promoted it on
  2026-11-23 18:18 UTC "at 82.76% on 29 pairs (floor 70%)". It has kept the seat against two challengers (§3).
- a measurement method, with its results on ten evaluator families, including the ones that failed;
- reference material for three intents (one uploaded and attested);
- findings about live miners.

**What we do not claim:** paid use of #210 or of our material, a finalized ranking, or that any other registration
of ours passed. The rules ask for exactly this distinction (§05, Evaluators): "Don't claim Canonical status, a
finalized ranking change, or paid material use without network evidence."

## 1. Project details (§08.01)

- **Team, contact:** LiveCert, `hyadav42774@gmail.com`; wallet `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`.
- **Track:** Evaluators.
- **Intents:**
  - canonical adapter: CONTRACT_OBLIGATION_AUDIT (#210);
  - registered, not passed: TEXT_SUMMARIZATION, CONTENT_MODERATION, EMAIL_SECURITY, SANCTIONS_SCREENING_MATCH (§3);
  - measured, not registered: QUESTION_ANSWERING, WEATHER_FORECAST_VERIFY, VULNERABILITY_TRIAGE,
    OPTIMAL_EXECUTION_ROUTE;
  - material: LANGUAGE_TRANSLATION_GENERAL (uploaded), and DNS_RECORD_LOOKUP_GENERAL and
    VALIDATOR_PERFORMANCE_VERIFY_GENERAL (truth sources, prepared).
- **Reviewer link:** https://github.com/Harshyadav442277/miner/tree/main/track2 (this file is the entry point; the
  link is valid once this branch is merged, so re-check it before submitting).
- **GitHub user who starred telegraphprotocol/bounties:** `Harshyadav442277` (`gh api` returned 204, 2026-11-23).

## 2. The method: a gate that can fail (`harness/`, ARCHITECTURE A7)

Our early adapters scored well on test sets we wrote and failed on answer shapes we had not written; the first one we
registered was rejected at 7/15 on its remote check (#46, G40). So every adapter is measured before it is offered:

1. **Node runtime, not the training kit.** `harness/measure.py` scores each pair with the kit's `adapterexec` on the
   Foundation Model validators run, keeps the f32 bits, and checks the identity echo. The kit and the node disagreed
   by up to 8 points on the same 400 pairs (G55), so only node-runtime numbers are reported.
2. **Baselines on the same pairs:** longer-answer-wins and shorter-answer-wins always; the family champion's own
   registered file and GENERIC where they exist (keccak checked against the registry).
3. **An unseen-style probe:** a test split in an answer layout training never sees, so a format shortcut shows up.
4. **The public pairs, offline:** each family's 15 public pairs, rebuilt from the node's own batches, are used to
   screen a version before it is signed and never to train. On the families checked it reproduced the node within one
   pair (CONTENT_MODERATION v2: 6/15 offline vs 5/15 at the node; CONTRACT_OBLIGATION_AUDIT v1: 15/15 both).
5. **Real-answer holdouts** (`freeze.py`, `gate.py`) where real miner answers can be labelled from a primary source:
   frozen by hash before any answer is seen, ≥ 100 pairs, champion + 2 points, a Wilson lower bound ≥ 0.70, and
   **service identity must not predict the label** (identity-only probe ≤ 0.65).

## 3. Results (§08.04 evidence)

### CONTRACT_OBLIGATION_AUDIT: canonical (#210)

Lane record: [adapter/contract_obligation_audit/README.md](adapter/contract_obligation_audit/README.md); registry
entry: [evidence/registration-210.json](adapter/contract_obligation_audit/evidence/registration-210.json).

| Set (node runtime) | #210 (v1) | Longer wins | Shorter wins |
|---|---|---|---|
| Own test, 400 pairs | **322 = 80.5%** | 201 = 50.3% | 150 = 37.5% |
| Unseen-style probe, 278 pairs | **249 = 89.6%** | 116 = 41.7% | 123 = 44.2% |
| Node's public check, 15 pairs | **15/15** | — | — |
| Node's hidden round, 29 pairs | **82.76%** (promoted) | — | — |

Measurements: [evidence/measure-coa_v1.json](adapter/contract_obligation_audit/evidence/measure-coa_v1.json).

- **Defended twice:** #219 was rejected ("win rate 86.21% did not beat the incumbent (registration 210)"), and so was
  #234 (79.31%), registered 2026-11-24 16:59 UTC. Each challenge is judged on that round's own sample, so 86.21% is
  not compared with #210's 82.76% from its promotion round. On #219's round #210 scored about 86% (our reading of
  that round, MEMORY 2026-11-24 03:40 UTC); the registry does not publish an incumbent's score on a challenger's round.
- **A better-looking v2 was not shipped:** v2 scored 85.0% in the kit but 76.75% in the node runtime, so it stayed
  unregistered (G55).
- **Weak kinds, stated:** party swaps 52/78, status on a date 9/21, CUAD clause present/absent 52/84.
- **Disclosure:** v1 trains on CUAD v1 (CC BY 4.0), and another contributor's pool rows also draw on CUAD. We never
  read a pool row, but the hidden sample may be easier for any CUAD-trained adapter.
- **Owed before submission:** GENERIC #900005 on the same 678 pairs (it needs a free gap in local RAM).

### The other registrations, and why they did not pass

| Family | Registration | Outcome | What it taught |
|---|---|---|---|
| TEXT_SUMMARIZATION | #217, #222 | rejected: remote executor unreachable (dead tunnel; Cloudflare 524 when the workers were paged out under training load) | Node runtime 399/400 own test, 200/200 probe, 360/400 = 90.0% on real bills (longer wins 47, shorter wins 241). The failures were hosting, not scoring |
| TEXT_SUMMARIZATION | #245, #246 | rejected 2026-11-26 00:11 UTC: remote executor unreachable (one tunnel lost the network, the other was stopped) | A quick tunnel does not survive a network drop or a stop; the public URL is now probed every minute while a registration is open |
| CONTENT_MODERATION | #218 | rejected, 5/15 public pairs | The pool asks Allow/Block policy questions and verdict-only JSON; v3 reached 10/15 offline, under the floor, so it was not signed |
| EMAIL_SECURITY | #220, #221 | #220 deregistered (dead URL); #221 rejected, 8/15 | The pool holds posture reports, worded DoH captures and phishing scenarios; v2 covers all three (training) |
| SANCTIONS_SCREENING_MATCH | #46 | rejected, 7/15 | Longer-answer-wins solved both real-answer captures |

### Families measured and stopped before registration

| Intent | Result | Why it stopped | Record |
|---|---|---|---|
| QUESTION_ANSWERING | v1 42.0%, v2 43.4% on a frozen 362-pair holdout; champion 45.3% | Gate FAIL on 6 rules; no scorer beat shorter-answer-wins (51.7%) | G42, G47 |
| EMAIL_SECURITY (real answers) | 2,700 responses, 69 wrong | 61 of 69 wrong answers from one service; identity probe 0.954 | G46 |
| WEATHER_FORECAST_VERIFY | 678 frozen queries | 56 pairs; identity probe 0.696 | G44 |
| VULNERABILITY_TRIAGE | 3-query pilot | only the champion author's miner gave NVD's score | G45 |
| OPTIMAL_EXECUTION_ROUTE | 126 real answers | 0 wrong answers to learn from | G48 |
| SENTIMENT_ANALYSIS | sa_v1, kit 95.75% | #216 already scores 100% and cannot be beaten | MEMORY 2026-11-24 |

**Still training on 2026-11-26** (each measured as above before it is offered): EMAIL_SECURITY v2, CONTENT_MODERATION
v4, QUESTION_ANSWERING v4, VULNERABILITY_TRIAGE v2, SMART_CONTRACT_AUDIT v1, FACT_CHECK v1.

## 4. Findings about live miners, for judges and providers

These are direct calls to each miner's public service as its YAML declares, made on 2026-11-16. They are not the
engine route.

- **EMAIL_SECURITY.** One provider (telegraph-verity-intelligence) reports NXDOMAIN as `lookup_ok: true` ("The lookup
  completed successfully; the requested DNS name does not exist") on 61 of 300 frozen queries. It answers HTTP 422 to
  every underscore name (`_dmarc.*`, `_domainkey`): 116 of 116 (`adapter/email_security/evidence/2026-11-16/`).
- **VULNERABILITY_TRIAGE.** On the one pilot CVE where NVD and the CNA differ (CVE-2025-4250: NVD 9.8, CNA 7.3), 12
  miner registrations on one host (7 `nvd-cvss`, 5 `ghsa-cvss`) returned the CNA score. The schema asks for the NVD
  primary score. This is a 3-query pilot, so it is indicative only (`adapter/vulnerability_triage/`).
- **Our own miner, scored down (G56).** On 60 frozen prompts each, LiveCert answered unanswerable questions from
  outside the passage (37 wrong answers kept), labelled clearly polar reviews neutral or refused them (12), and gave
  19 FACT_CHECK verdicts against FEVER's labels. These become pairs where LiveCert's answer is the worse one.
- **Comparators are retired:** #199 FX_NOW was deactivated with "Comparator modules are no longer accepted". Our
  comparator pack (§5) is kept as a verified port of `ReferenceScore`, not as an entry.

## 5. Contributions

- **The harness** (`harness/`: capture, freeze, measure, merge_results, compare, gate, netguard, selfcheck_pairs;
  21 tests). It is reusable for any judgment family, and network inputs are treated as untrusted (`netguard.py`). A
  15-minute walk-through is in [TUTORIAL.md](TUTORIAL.md).
- **A detached local executor** (`executor/launch.py`, `run_local.ps1`). It survives a session restart and a console
  Ctrl+C; it does not survive a crash, a shutdown, a network drop or a stop. It runs workers in their own process group,
  four per adapter, a fan-out that splits the node's 30-text batch (58.9 s through the tunnel, under Cloudflare's
  100 s cut), and a capture of every batch the node sends.
- **The comparator pack** (`comparator/`): a 2,182-byte `no_std` Rust port of the network's `ReferenceScore`. It
  agrees with the kit's rule on 234,848 node-runtime grid cases and with the champions on a frozen 3,365-case
  adversarial suite, where six wrong mutants fail on 3–704 cases each (`comparator/evaluation/`).
- **Material:**
  - **Uploaded, with network evidence:** `material/out/LANGUAGE_TRANSLATION_GENERAL.jsonl`. 144 rows uploaded on
    2026-11-04 by signer 0xdAd2…A39e; all 144 `eligible` and `attested`
    (`/api/evalpool/submissions/mine?submitter=0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e&intent_id=LANGUAGE_TRANSLATION_GENERAL`,
    read 2026-11-17). **Related party:** livecert serves that intent, so these rows may score our own miner; they are
    dataset translations (Tatoeba), not livecert's answers.
  - **Prepared for owner-signed upload:** `material/dns_truth/` (DNS_RECORD_LOOKUP_GENERAL) and
    `material/validator_truth/` (VALIDATOR_PERFORMANCE_VERIFY_GENERAL). Related party: livecert serves the first.
  - **Kept as evidence, not uploaded:** 40 EMAIL_SECURITY real-answer pairs; 36 of the 40 rejected answers come from
    one service, which fails our own identity bar.

## 6. How to run it (§08.03)

The quick path needs no kit, key or wallet: [TUTORIAL.md](TUTORIAL.md) (capture, DNS truth and labels on 3 frozen
queries in about 15 minutes). The node-runtime re-score needs the tg-eval venv with `tokenizers` and the kit
`telegraph-wasm-baseline` at `1ed063e` for `adapterexec`:

```bash
cd track2/harness
python -m unittest test_harness                 # 21 tests
C:/Users/hyada/tg-eval/.venv/Scripts/python.exe measure.py --home C:/Users/hyada/tg-eval \
  --package coa_v1=<CONTRACT_OBLIGATION_AUDIT v1 .safetensors> \
  --pairs test=<pairs/coa_v1/test.jsonl> --pairs probe=<pairs/coa_v1/probe.jsonl> --out results.json
```

Expected: 322/400 on `test` and 249/278 on `probe`, bit-identical to `measure-coa_v1.json`. The package is public at
`telegraph-factscore` `4298d6d` (`season2/adapter/CONTRACT_OBLIGATION_AUDIT/v1/`, keccak `0xbf759737…60e8`); the pairs
are rebuilt by `adapter/contract_obligation_audit/generate_pairs.py` (command in its README).

- **Cost:** Sepolia gas for each registration and a bond in test USDC (the Diamond's `entityBonds()` read 0.1 / 1.0 /
  0.1 USDC on 2026-11-23; the registry shows `bond_amount: 0`, G54). CPU and GPU time is local.
- **Known limits:**
  - our executor runs on a laptop behind a Cloudflare quick tunnel: it dies with the network, a sleep or a reboot,
    and a free stable host was not available (Hugging Face Docker Spaces need PRO, 2026-11-23);
  - how the hidden pool renders a request is unknown (G43);
  - captures call each miner's public service directly, not the engine route;
  - labels read by a model are marked as such.

## 7. Status of owner actions (fill in before submitting)

| Action | State | Network evidence to attach |
|---|---|---|
| Star telegraphprotocol/bounties | **done** (2026-11-23, 204) | `Harshyadav442277` |
| CONTRACT_OBLIGATION_AUDIT adapter | **canonical #210** since 2026-11-23 18:18 UTC | `/api/wasm`, registration 210 |
| LANGUAGE_TRANSLATION material | **done 2026-11-04** | 144 rows eligible, attested (§5) |
| DNS truth upload | not done | row state; scores at an epoch after the upload |
| Validator truth upload | not done | row state; scores at an epoch after the upload |
| Organiser report (`material/ORGANISER_REPORT.md`) | not sent | the link |
| Demo video (2–5 min) | the 2026-11-17 cut predates #210; a new cut is owed | the video link |
| Three dated public updates (growth) | post 1 on 2026-11-23 (URL not recorded); posts 2 and 3 drafted in `OUTREACH_S2.md` | the links |

## 8. Public summary (§08.05)

> Our CONTRACT_OBLIGATION_AUDIT evaluator is the family's first canonical adapter on the Telegraph devnode (#210),
> and it has held the seat against two challengers. We measure every adapter in the node's own runtime against
> answer-length baselines and an unseen answer style before it is signed, and we publish what failed: summaries lost
> to dead tunnels, a moderation adapter at 5/15, and four families where right and wrong answers split by service.
> Try it: `track2/TUTORIAL.md` in the LiveCert repository.

## 9. Showcase permission (§08.06)

The owner decides. Default proposal: all text, tables and code public; no buyer introductions.
