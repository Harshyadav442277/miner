# G210: five suspect answers checked against their sources (2026-10-25)

The five answers came from the latency re-measure on production `miner-8lwhe1wtl`
(`release-2026-10-25/README.md`). Each was re-asked and compared with its primary source.

| # | Question | Production said | Primary source | Cause | Fix |
|---|---|---|---|---|---|
| 1 | "Is Nvidia Corporation an active registered company?" | `not_found` for "Nvidia Corporation an" | GLEIF: NVIDIA CORPORATION, LEI 549300S4KLFTLO7GSQ80, ACTIVE, Delaware no. 2862596, created 1998-02-24 | The subject pattern stopped before "active" and kept the "an" | `registry.ts` skips an article or "still" before the status word. The branch now answers exactly the GLEIF record |
| 2 | "Latest annual report filing from Coca-Cola on EDGAR" | `unknown`, "upstream unavailable" | EDGAR submissions: 10-K filed 2026-02-20, accepted 14:46:32 UTC, accession 0001628280-26-010047, period 2025-12-31 | SEC answers Coca-Cola's Revenues concept with `"USD": {}`, not a list. `figuresFor` crashed, and the route reported the crash as an outage | `filings.ts` `usdFacts` treats a non-list as no facts. The branch answers exactly the EDGAR record |
| 3 | Exoplanet headline as politics, sport or science | `ambiguous` | Plainly science | The relatedness index barely knows "exoplanet", and the model was only allowed to decide where the word list already had a margin | The model decides where the word list declines, may answer "none", and is served at confidence 0.6 with a note |
| 4 | VAT-invoice ticket as billing, technical or account issue | `ambiguous` | Plainly billing | As #3 | As #3 |
| 5 | Google's Safe Browsing malware test page | `unknown`, "URLhaus did not give a clear answer" | URLhaus: every bulk download answers **410 Gone** ("remove all references") and its API **401** without an Auth-Key | URLhaus retired its free downloads, so every scan reported the lists as down. **Every clean URL on URL_SAFE and URL_SCAN was answered "could not be judged"** | URLhaus removed. A safe verdict now needs Cloudflare and Quad9 both to answer. The page itself is listed only by Google Safe Browsing, which we do not consult (a coverage limit, not a defect) |

## The classification change, measured

`prose-model-g210.txt` in `../conformance-2026-10-25/`: 24 hand-labelled classification items, including 4
contentless texts whose right answer is no label.

| Version | Correct |
|---|---:|
| Word list only | 16/24 |
| With the model deciding where the word list declines | 22/24 |

- The remaining misses: "Please see the attached file." was labelled account issue, the cost of this rule
  (1 of 4 contentless texts). A ham email's reply landed at 362 ms, past the 350 ms deadline, and fell back.
- A first run, before the prompt named attachments, also gave 22/24, with the exoplanet headline a deadline
  fallback.

## After the fix, branch run against live sources

- Nvidia: GLEIF record as above.
- Coca-Cola: the EDGAR 10-K as above.
- `https://www.bbc.co.uk` is `safe` (not listed by either filter).
- `malware.testcategory.com` is `unsafe` (Cloudflare blocks it).
- Unit tests 794/794.

## Not done

- The deployed manifest (`miner.yaml`) still describes URLhaus. That file is hashed into registration 4829
  (G86), so its wording changes only with the next `updateMiner`.
- URLhaus can come back through its API if the owner registers an abuse.ch Auth-Key. Its terms for
  commercial use are unread.
