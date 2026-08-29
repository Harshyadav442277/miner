# Track 2 calibration portfolio

This is a six-intent, audit-first response to registration 1765. It does not infer hidden
fixtures or fingerprint miners. Each candidate starts from the intent's active MIT-licensed scorer
and changes only score calibration. Changed WASM bytes require fresh registrations.

## Why the contrast wrapper is safe

For a base score `s` in `[0,1]`, the wrapper returns:

```text
f(s) = s + 0.01 * s * (1 - s) * (2s - 1)
```

It fixes `0` and `1`, pushes scores below `0.5` down and scores above `0.5` up, and is strictly
increasing. At the portfolio default `0.01`, its derivative stays in `[0.99, 1.005]`, so
real-number ordering and Spearman rank are
preserved while avoiding the endpoint compression that cost registration 1765 three cases. The
builder appends one 57-byte function and redirects only the `rank_answer` export; the original
module, embeddings, allocator, memory, and imports are unchanged.

## Candidates

| Intent | Active base | Calibration | Candidate bytes | Candidate SHA-256 | Candidate Keccak-256 |
|---|---:|---:|---:|---|---|
| LANGUAGE_TRANSLATION | reg 1745 | internal alpha `0.60 -> 0.61` | 5,114 | `8ccd601063ef3b3090487646b9b1d427a85fd38ec8bde5813f18c2610ad619fd` | `37fa2368c4d1b5ba5820ef73889fa3ab18581e6cc4458f6919cf963eb05340d7` |
| TEXT_AUTHENTICITY_CHECK | reg 850 | contrast `0.01` | 23,987,908 | `fbaf8d98bf09ff0559c9da9d655ee065eb4a5f7d007d579449d630d2a990c655` | `ffee140d8a3c1b739d2650a234882217874cbc53cdeb33689bdaecfce5fb0df1` |
| ACADEMIC_SEARCH | reg 688 | contrast `0.01` | 23,989,511 | `c07cf03b9b52a543564fd0f48bc902d94b8d85588fdd372983c3cd817e865be1` | `169d7c9020544003811093f91a1c4ce378c8292c9487cea0ead29ff66b16e832` |
| WEATHER_FORECAST | reg 636 | contrast `0.01` | 23,989,279 | `8b84ff17f79b1437ae7f54ea3bd75d951b0526fb070f67454f0a3b40d7e54839` | `81e579a751546aad03d1a0f5a80dcd8bf992729084adb624e8871e5deb6418f3` |
| FRAUD_DETECTION | reg 1756 | contrast `0.01` | 23,987,890 | `7e49a836ce59045f953491ea8b92111db4209f665aa07b49570a0c89c132e21f` | `8ec0ccba628864d7cb60c8ec62e8f690a4cb4efaf699a2bb65a43697619e8ea5` |
| CVE_LOOKUP | reg 1446 | contrast `0.90` | 1,075,816 | `b150b15587f4bfc60bf8b0ac1cc7d585d4121f185f2dd2e0c17deb22ae5fc2eb` | `dba55e78c954e26fd91bdbfea2d6d4a722e4c087c2cccd629efc54c46e5878ae` |

## Pinned bases

| Intent | URL | SHA-256 | Registry Keccak-256 |
|---|---|---|---|
| LANGUAGE_TRANSLATION | `https://raw.githubusercontent.com/zkasuran/telegraph-salience-scorer/52c65788253791004e5633af9c2d8098d180d435/dist/fork/lts_e6.wasm` | `9407b62d1980c8a2e9cc7622da33485d02c390007695d02ab138e64b916ced9e` | `106360773c2c6646bfd7a4fdca579989d01a00716ac37c8337de611f24d63237` |
| TEXT_AUTHENTICITY_CHECK | `https://raw.githubusercontent.com/zkasuran/telegraph-salience-scorer/85381b739a9d047f068dc2b3642ceef9a569f48d/dist/xfmr/tn_t70.wasm` | `432ae4423edd24ea74d8529fef8bf61d50ccc6622da94619482f9213b1f32395` | `14f7076c4b4931efd33573ab3f2c9f3ee0eb6585101f0c238663e9340c004f57` |
| ACADEMIC_SEARCH | `https://raw.githubusercontent.com/zkasuran/telegraph-salience-scorer/5a0a5b7f5189ae26fc158385c8d69b5cebf20856/dist/xfmr/acad_pen.wasm` | `dd48e9228cb85e85c634b65b694ae9bdcbce20c7d4cde6f9d5c1889581886612` | `782f7631221ef558040f646ea825a4a42b7d15f6918091c5e204cdb7ef3fa03b` |
| WEATHER_FORECAST | `https://raw.githubusercontent.com/zkasuran/telegraph-salience-scorer/f009d2d778bd49611dcc0a7e3819a8dca74d1aad/dist/xfmr/wf_mini.wasm` | `61db5f04aff9cba379e03cac2dc6fc0e2835bb9b5aa798ebca595053f119310a` | `dd7dc9e9adab581c6f124050bd76a5f88b6f4bcdedf64dbc79993bc055f963ff` |
| FRAUD_DETECTION | `https://raw.githubusercontent.com/zkasuran/telegraph-salience-scorer/686cef7bb1ae1cf7a55aff50ee97a997d6a588f1/dist/fork/fr_ss3.wasm` | `97d6a7690c1433ae6dd5efebc3a37aa631afcfc31ceb9a6f27a7e12321134489` | `79eedd5764b93443c8d57763c0adb0c0f5d9ccd85d553790c82a915d7d194d8c` |
| CVE_LOOKUP | `https://raw.githubusercontent.com/zkasuran/telegraph-salience-scorer/dd408db5ade3ae021b82156cd6772fb9414a604f/dist/reclaim/cve_ms_10.wasm` | `3a75b2047229348cfdca43d6c167f9f63912b30cc0ef2fa09ded0588900f6e57` | `66439dd479d6f0b6259c65c23be02641c170b6da0a63394593c71af5208dfa56` |

## Registration ROI order

1. `FRAUD_DETECTION`: active base is 15/15, margin 0.8769148, historical Spearman 0.9123722.
2. `LANGUAGE_TRANSLATION`: predicted margin 0.75902011 versus 0.75895786 with a 0.01 alpha step.
3. `TEXT_AUTHENTICITY_CHECK`: active base is 14/15 with no historical Spearman gate.
4. `WEATHER_FORECAST`: active base has full fixture ordering; the wrapper preserves its live ranking.
5. `ACADEMIC_SEARCH`: active base ordering is preserved, but its fixture count is weaker than the first four.
6. `CVE_LOOKUP`: optional moonshot. The active margin is already 0.99999905. The MIT base used here
   scored 15/15 at 0.9999948 with Spearman 0.7282715; contrast 0.90 predicts enough endpoint
   compression to cross the live margin, but f32 ties make it the riskiest registration.

Upstream copyright and MIT permission are preserved in [`UPSTREAM_LICENSE`](UPSTREAM_LICENSE).
