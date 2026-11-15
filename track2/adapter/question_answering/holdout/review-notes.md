# Review notes, qa-2026-11-15-r1 labels

Verdicts live in `verdicts.json`; `apply_verdicts.py` writes them into the last column of `review.tsv` and `review-auto.tsv` and asserts columns 1-7 equal the `.orig.tsv` backups. Judged against the gold lists only, no outside lookup.

Conventions used:
- Refusals and service errors ("The sources do not say", "could not be reached", "sources do not contain a sentence...") on `needs_review` rows are `incorrect` (rule b: asked fact not stated). The single `no_answer` row (nq-1741 a1-preflight, a JSON not_found) is left empty = confirmed refusal.
- A Wikipedia lead that never states the asked fact is `incorrect`; a cast list that merely contains the gold name without tying it to the asked role is `skip` (auto file).
- Different answer to a question with several defensible answers (first home run, largest man-made lake, first street, etc.) is `skip`, not `incorrect`.

## review.tsv verdicts per system (332 rows)

| system | correct | incorrect | skip | empty | total |
|---|---|---|---|---|---|
| a1-preflight | 4 | 88 | 13 | 1 | 106 |
| livecert | 3 | 76 | 16 | 0 | 95 |
| txlens | 9 | 47 | 8 | 0 | 64 |
| zk-text | 16 | 24 | 27 | 0 | 67 |
| all | 32 | 235 | 64 | 1 | 332 |

## review-auto.tsv verdicts per system (128 rows; empty = stays provisionally correct)

| system | empty | incorrect | skip | total |
|---|---|---|---|---|
| a1-preflight | 10 | 1 | 3 | 14 |
| livecert | 21 | 3 | 1 | 25 |
| txlens | 28 | 0 | 8 | 36 |
| zk-text | 50 | 1 | 2 | 53 |
| all | 109 | 5 | 14 | 128 |

## Questions skipped entirely (every row in both files)

- nq-581: yes/no "typically, no" gold
- nq-670: "3 candidates" gold arbitrary, answers list different valid sets
- nq-1815: gold vague; sciatic nerve does not run in foot
- nq-2793: gold 31,038 outdated; all answers differ by year
- nq-2913: ambiguous which eliminated contestant; several golds
- nq-3033: question truncated, no subject; ambiguous
- nq-3074: golds "eleven | seven" conflict; count varies by year
- nq-3406: gold "treats" does not answer origin question
- nq-3595: gold is a village, question asks city

## Fifteen example rows

Correct
1. review nq-8 txlens: "hidden sexual mini-game ... disabled by developers but left in the game files" matches gold "normally inaccessible mini-game".
2. review nq-537 livecert: 21,196.18 km matches gold 21,196 km.
3. review nq-635 txlens: "President James Monroe warned European nations ... 1823" is the Monroe Doctrine.
4. review nq-1838 a1-preflight: says Italian and German declarations of war on 11 Dec 1941, matches Fascist Italy / Nazi Germany.
5. review nq-2330 txlens: BAC is alcohol "in relation to the parts of blood" matches "volume of blood".

Incorrect
1. review nq-116 a1-preflight: describes self-checkouts, never says where a cashier's check comes from.
2. review nq-493 zk-text: Andie MacDowell as Tom contradicts gold James Fleet.
3. review nq-1038 zk-text: attributes the song to Tenor Saw, contradicting Dottie West / Kenny Rogers.
4. review nq-1336 a1-preflight: describes white matter, never says gray matter holds dendrites and cell bodies.
5. review nq-3543 livecert: Frank Wildhorn contradicts gold Masaru Yokoyama.

Skip
1. review nq-453 txlens: "anterior interventricular groove" is a valid location but not the gold "left coronary artery".
2. review nq-1315 zk-text: names A. O. Hume and W. C. Bonnerjee; question "a leader" has many valid answers.
3. review nq-1631 zk-text: gives "l'envie de vivre" and "le goût de la vie", not "joie de vivre"; other plausible translations.
4. review nq-1466 zk-text: says 1906 for the first case versus gold 1901; both dates defensible.
5. review nq-2504 zk-text: "Immigration Act of 1882" is close to, but not, the gold acts; gold lists two conflicting answers.

## review-auto.tsv rows demoted

incorrect (5):
- nq-116 livecert: quote about deposits "into a bank account"; "bank" is incidental, never says where to get the check.
- nq-1572 livecert: says the sources contain no answer; "Michigan" appears only in source titles.
- nq-1572 zk-text: commits to Ohio State having more championships, contradicting gold Michigan.
- nq-2330 a1-preflight: "ethanol" appears only as a chemical name for alcohol; does not say what BAC is relative to.
- nq-2977 livecert: says the sources contain no answer; "Arkansas" appears only in source titles.

skip (14):
- nq-627 txlens: gives several cities for adults, Pittsburgh only as where they were raised; hedged.
- nq-670 txlens, zk-text: whole question skipped (arbitrary "3 candidates" gold).
- nq-689 a1-preflight: Rome appears only as boutique location on the street beside the Spanish Steps.
- nq-778 a1-preflight, txlens: gold name appears as the actor of a Santa Clarita Diet character, never as the principal.
- nq-915 a1-preflight, livecert, txlens: lead is about the proposed New Trafford; Old Trafford only as the current home.
- nq-1405 zk-text: commits to 1995 as the first celebration; 1976 and June 16 appear only for the uprising.
- nq-1572 txlens: rivalry text gives most wins, not championships; Michigan incidental but not a clear miss.
- nq-3132 txlens, nq-3168 txlens, nq-3486 txlens: cast list contains the gold name but never ties it to the asked role.
