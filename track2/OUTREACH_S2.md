# Evaluator education and activation ledger

The Evaluator rubric gives 20 points to growth: education, ease of adoption, distribution and activation, 5 each.
**The owner publishes; nothing here has been posted.** Each draft below uses only results that a reader can
reproduce from the public repo. The rules ask a contest post to disclose hackathon participation and the prize
incentive, so every draft does. Three updates must go out on separate dates.

| # | Topic | Post on (UTC) | Published URL | Independent action |
|---|---|---|---|---|
| 1 | Why we stopped training evaluators: real answers, a frozen gate | first free day | not published | none recorded |
| 2 | Miner errors found by checking answers against primary sources | ≥ 1 day after #1 | not published | none recorded |
| 3 | Two unranked intents, neutral truth sources, the network check | after the uploads + network evidence | not published | none recorded |

## Draft 1: the gate and why every lane stopped

> We're competing in @Telegraphprotoc Season II (Evaluator track, which has cash prizes). Here's an honest result:
> none of our trained evaluators beat a champion, and the gate that stopped them is the useful part.
>
> Every candidate is measured on answers we did not write: real miner answers, labelled from primary sources (DNS,
> NVD, weather stations), and frozen before training. On QUESTION_ANSWERING, two iterations scored 42.0% and 43.4%
> against the champion's 45.3%. Our own test splits had passed.
>
> In 4 more families, right and wrong split almost entirely by service. Wrong answers came from 1–3 services
> (EMAIL_SECURITY, weather), right ones from a single service (VULNERABILITY_TRIAGE), or there were no wrong numbers
> at all (OPTIMAL_EXECUTION_ROUTE). A scorer could "win" there by recognising a service's format. We refuse such a
> holdout (identity probe > 0.65), so those lanes stopped before training.
>
> Method, gate and every verdict: <repo link to track2/harness/README.md and GAPS.md>

## Draft 2: what checking real answers found

> Building @Telegraphprotoc evaluators (Season II hackathon entry, prize-eligible), we labelled thousands of real
> miner answers against primary sources. Some errors are worth knowing if you run a miner:
> - EMAIL_SECURITY: one service reports a name that does not exist as `lookup_ok: true`, in 61 of 300 queries.
>   `lookup_ok` means NOERROR, and NOERROR with no records is still true.
> - VULNERABILITY_TRIAGE: the schema asks for the NVD primary CVSS. Where NVD and the vendor's (CNA's) score differ,
>   most services return the vendor's score. (3-query pilot: indicative only.)
> - OPTIMAL_EXECUTION_ROUTE: every numeric quote was within 0.25% of the best public aggregator quote. The failures
>   were non-answers, not wrong numbers.
>
> Reproduce the DNS check in about 15 minutes, with no wallet or key: <repo link to track2/TUTORIAL.md>

## Draft 3: the unranked intents (post only after network evidence exists)

> Two deterministic @Telegraphprotoc intents had not been ranked for days: DNS_RECORD_LOOKUP since epoch 2019 and
> VALIDATOR_PERFORMANCE_VERIFY since 2032. A deterministic intent is ranked against "truth sources", public APIs that
> answer the question. We contributed neutral ones: DNS.SB and NextDNS, and the PublicNode beacon API. Our own miner
> serves DNS_RECORD_LOOKUP, so we disclose that; the sources are public resolvers we don't run. (Season II entry,
> prize-eligible.)
>
> Result: <fill in only from the network: our row states, and the first epoch with new scores in `/api/miners`>.
> Check it yourself: `curl https://devnode.telegraphprotocol.com/api/miners` and look for the intent's latest
> `epoch_id`.

## Invitation (attach to any draft)

> If you run a miner or an evaluator: pick one intent, run the tutorial's capture and label steps on it, and tell us
> where our labels are wrong. Open a repo issue with the query, the expected label, the actual label and the command.
> Feedback that disproves us is welcome.

## Evidence to keep for every real developer action

Keep a public URL or reviewer-access evidence, the date, why the operator is independent of us, the command or input,
the outcome, and the link showing it came from this work. Our own runs, LiveCert calls, stars, reactions and follower
counts are not independent activation.
