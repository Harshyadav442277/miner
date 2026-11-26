# DOCUMENT_AUTHENTICITY adapter lane (opened 2026-11-26)

**Why this family:** no champion (`/api/wasm`, 2026-11-26); 199 eligible pool rows from 3 submitters; and the query
carries the evidence: "Query supplies a document plus its signature, seal or timestamp data and asks whether it is
genuine and unaltered: certificate chain, notarization, tamper-evident seal, checksum" (bounties #80). The one judged
adapter so far, `0x8b2247`'s #236, ordered 6 of 15 public pairs. LiveCert does not serve this intent.

## Data: [generate_pairs.py](generate_pairs.py) (v1)

Each query lists a document's evidence, built by the script, so every check is a comparison the query shows: the
received file's SHA-256 against the signed manifest; the issuer chain to the trusted root; the signing time against the
certificate's validity; the signer serial against the CRL; the timestamp against the document date; the seal number
against the notary register.

| Better answer | Worse answer (same style, about the same length) |
|---|---|
| The verdict, each failing check with the figures that fail, and each check that passes | the wrong verdict (a failure described from evidence the query does not show, or "genuine" on a forged document); the failure pinned on a check that passes; a second failure missed |

- About a third of documents are genuine. No refusal negatives.
- Splits: a fixed fifth of document types and signers is test-only; test seed 97; `probe.jsonl` answers in a table.
  3,000 train, 300 val, 400 test, 300 probe (`tg-eval/pairs/da_v1`).

**Kit dataset gate, 2026-11-26: PASS** (unique negatives 100%, largest 0.0%, length shortcut 58.1%, held-out leak
0.0%, bag-of-words probe 57.1%). The first build failed on the bag-of-words probe (66.4%): half the documents were
genuine, so failure wording leaned to the rejected side.

## Training and results

Job `DOCUMENT_AUTHENTICITY:da_v1:da_v1` (rank 8, alpha 32, 3 epochs, lr 1e-4), queued 2026-11-26 05:51 UTC on its
own runner. Before signing: node runtime on test and probe with the length baselines and GENERIC #900005. No results yet.
