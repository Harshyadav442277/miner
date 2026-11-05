# FACT_CHECK on the claims paying callers sent — 2026-11-05 (GAPS G262)

**Inputs.** `inputs.json` has the 37 distinct claims (42 requests) in every FACT_CHECK_GENERAL request the Engine routed
to `livecert` from 2026-11-01 to ~19:00 UTC 2026-11-05, read from the public Daemon feed
(`devnode.telegraphprotocol.com/daemon/api/questions`). All of them were sent on 2026-11-03 and all named LiveCert
("Intent: miner livecert given by the caller"). Payer wallets were not read for this set. `prod` is the verdict production
gave then; `signal_hash` lets anyone re-read the request. `truth` is our label from general reference knowledge:
21 true, 5 false, and 11 `null` for text that is not a checkable claim (a bare title, "It ..." with no referent, an
opinion, or an event this source cannot know).

`regression-inputs.json` has 31 more claims: the five FACT_CHECK questions of the 2026-11-04 audit, the two in the
`intent-answers` gate, the cases named in the fact-check source comments, and false claims built from the articles the
fix reads (a wrong year, founder, maker, prize, height, continent or class, and a compound with a false second half).

**Runs.** 2026-11-05 20:24–20:27 UTC, against live Wikipedia, with
`node --dns-result-order=ipv4first track1-miner/tools/factcheck-replay.mjs <dist-test> <inputs> <out>`:
- `before.json`, `regression-before.json`: the tree `4fb477e` (`C:/Users/hyada/tg-deploy/m4fb477e`). Production has
  been `9b82d08` since ~19:10 UTC, and its fact-check files are identical to `4fb477e`'s (`git diff 4fb477e 9b82d08`
  on `src/fact*.ts` is empty), so these are production's answers.
- `after.json`, `regression-after.json`: this change, built in `C:/Users/hyada/tg-deploy/fc-dev`.

A verdict is **right** when it is decisive and agrees with the label, **wrong** when it is decisive and disagrees, and
**open** when it is `unverified` or `unknown`.

| Set | Before: right / wrong / open | After: right / wrong / open |
|---|---|---|
| 37 real claims (26 checkable) | 7 / **3** / 27 | 14 / **0** / 23 |
| 31 regression claims (30 checkable) | 19 / **2** / 10 | 17 / **0** / 14 |

No `null`-labelled text was settled in either run.

## What changed, claim by claim

Real claims:

| Claim | Before | After |
|---|---|---|
| Venus is the largest planet in the Solar System. | supported (**wrong**) | unverified |
| The Eiffel Tower is located in Berlin and was completed in 1889. | supported (**wrong**) | contradicted |
| Mount Kilimanjaro is the tallest mountain in Africa at 5895 metres. | contradicted (**wrong**) | supported |
| GPT-3 was released by OpenAI in 2020 and has 175 billion parameters. | unverified | supported |
| The transformer architecture was introduced in 2017 in the paper "Attention Is All You Need". | unverified | supported |
| "Attention Is All You Need" is a research paper published in 2017 by researchers at Google. | unverified | supported |
| The Golden Gate Bridge opened in 1937. | unverified | supported |
| Marie Curie won the Nobel Prize in Physics in 1903. | unverified | supported |
| The Sydney Opera House opened in 1973. | unverified | supported |
| The first iPhone was released by Apple in 2007. | supported | unverified |

The iPhone claim was supported before on a merged non-sentence ("... the iPod Touch in September 2007 ... system.
iPhone OS 2 was released on July 11, 2008 ... Apple's App Store"), not on a statement of the release.

Regression claims:

| Claim | Before | After |
|---|---|---|
| GPT-3 was released by Google in 2020. | supported (**wrong**) | unverified |
| Mount Kilimanjaro is a river. | supported (**wrong**) | contradicted ("It is the highest mountain in Africa") |
| Mount Kilimanjaro is the tallest mountain in Asia. | contradicted | unverified |
| Mount Kilimanjaro is the tallest mountain in Africa at 4900 metres. | contradicted | unverified |
| Mars is the largest planet in the Solar System. | contradicted | unverified |

The last three were right before for the wrong reason. Both Kilimanjaro claims were contradicted by "Kilimanjaro is
drained by a network of rivers ...", which is the class bug below. Mars was contradicted by "Mars is approximately half
the diameter of Earth ...", which does not address the claim either.

Every decisive verdict in `after.json` and `regression-after.json` was read by hand: each quotes a sentence that
states the claim or rules it out.

## The causes, and the change (`src/factevent.ts`, `src/factsubject.ts`, `src/factarticle.ts`)

- **Two thirds of the words is not support.** "Venus is one of the four terrestrial planets in the Solar System" held
  three of the four key words of "the largest planet in the Solar System". Now support (and contradiction) needs every
  number, superlative or ordinal, and named entity of the claim (`criticalKeys`). "tallest" and "highest" count as one.
- **A compound claim was settled by its true half.** A claim that joins statements with "and" before a verb is now
  checked part by part (`settleClaim`). One part ruled out rules out the claim, and support needs every part.
- **A word near a copula was read as a class.** "Kilimanjaro is drained by a network of rivers" contradicted "the
  tallest mountain" (rival class "river") and supported "is a river". A class now counts only as the complement of the
  subject's own copula, and a passive ("is drained by", "is located in") gives none (`complementTokens`).
- **Kilimanjaro's lead was never read.** "It is the highest mountain in Africa ... at 5,895 m" opens on "It", and
  "5,895" split at the comma. Now a leading It/They/He/She in the first five sentences stands for the subject, and
  thousands separators are removed before tokenising.
- **Dated events were never settled.** `eventSentence` reads "X opened in 1937" against "The bridge opened to the public
  on May 27, 1937": a subject reference, then the same verb, then the claimed year, in one stretch. Another year is not
  read as a refutation. Support for any claim with an event verb needs that verb (or a listed wording of it) tied to the
  subject (`statesEvent`), so neither "strong iPhone sales put Apple at second place" (2007) nor "a platform erected
  on the steps of Rathaus Schöneberg" counts.
- **A figure from elsewhere in the sentence.** The Kilimanjaro lead also gives "4,900 m ... above its plateau base". A
  claimed figure must now be the sentence's first figure in that unit (`quantitiesAgree`).
- **Lists and link sections are not statements.** Marie Curie's "Awards and honours ... include: ..." list held every
  word of "won the Nobel Prize in Chemistry in 1903", and the iPhone article's "See also" links held "Apple", "release"
  and "2007". A sentence with three bracketed figures, or a colon followed by three commas, is not evidence
  (`listLike`). An article is read only up to its See also / References / External links sections. Sentences also
  split before "iPhone"-style words.
- **A quoted title became the whole claim.** `extractClaim` took any quoted span as the claim, so two claims about the
  paper were checked as the bare title "Attention Is All You Need". A quote is now the claim only when nothing but an
  instruction surrounds it. A quoted title that opens a claim is its subject.

## Tests

`test/factevent.test.ts`: 16 tests, on sentences copied from the live articles on 2026-11-05 (Venus, Mount
Kilimanjaro, Eiffel Tower, Marie Curie, Golden Gate Bridge, Sydney Opera House, iPhone, Berlin Wall). Unit 903/903,
and the five live fact-check tests 5/5, in `C:/Users/hyada/tg-deploy/fc-dev`.

## Limits

- The labels are ours, not the caller's or an evaluator's. Their reference answers are not public.
- Most true claims are still `unverified` (9 of 21 real ones). Among them: "The Berlin Wall fell in 1989" (the article
  says "came down"), "BERT was introduced by Google in 2018" (the subject resolves to a disambiguation page),
  "Mount Everest is 8849 metres tall" (the article gives 8,848.86 m), and claims about the Transformer paper's details.
  Three of the five false real claims are still open, not refuted: "Venus is the largest planet", "BERT was introduced
  by Meta in 2012" and "Water boils at 90 degrees Celsius at sea level". Another year, value or rank is not read as a
  contradiction.
- The fallback search path (`judge()` in `factcheck.ts`) is unchanged. It contradicts on any refutation word ("is
  not", "myth") once 35% of the claim's words overlap, and it can still do so for the wrong reason.
- Wikipedia is the only source, and it can change between runs.
- Not deployed. Production answers as `before.json` does until a release.
