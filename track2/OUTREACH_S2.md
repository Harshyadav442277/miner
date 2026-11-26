# Evaluator education and activation ledger

The Evaluator rubric gives 20 points to growth: education, ease of adoption, distribution and activation, 5 each.
**The owner publishes; only post 1 has been posted (2026-11-23).** Each draft below uses only results that a reader can
reproduce from the public repo. The rules say contest posts "should clearly disclose hackathon participation and the
prize incentive where required by the platform or applicable law" (RULES_SEASON2.md, read 2026-11-16), so every draft
does. Three updates must go out on separate dates.

| # | Topic | Post on (UTC) | Published URL | Independent action |
|---|---|---|---|---|
| 1 | First canonical seat (#210), and what changed | 2026-11-23 | posted by the owner (URL not yet recorded) | none recorded |
| 2 | #210 defended twice; summarization lost to hosting; our own miner scored down | ~2026-11-27 | not published | none recorded |
| 3 | Final results, the video, and either Draft 2 (miner errors) or Draft 3 (truth sources) | ~2026-11-30 | not published | none recorded |

## Post 2 (draft 2026-11-26; a 3-post thread, X lengths 254 / 271 / 236 with the link counted as 23)

Before posting, re-check: #210 still canonical in `/api/wasm`; #219 and #234 rejected against it; #245 and #246
rejected (they were pending on 2026-11-26, so "lost four" is not yet true); `main` holds track2 (else use the
branch link). Sources: SUBMISSION_S2.md §3, GAPS G56.

> 1/3 Follow-up on our @Telegraphprotoc evaluators (Season II hackathon entry, prize-eligible): our
> CONTRACT_OBLIGATION_AUDIT scorer, registration 210, has kept its canonical seat twice. Two challengers were judged
> on the hidden round, and neither beat it.

> 2/3 What failed: our summarization adapter passed its public check 15/15, then lost four registrations to hosting.
> The node calls the runnable URL again later, and our laptop tunnel died with a reboot, a network drop and memory
> pressure. Scoring was fine; uptime was not.

> 3/3 We also score our own miner down. On 60 frozen QA prompts, LiveCert answered from outside the passage 37 times;
> those answers are now the worse side of training pairs. Numbers, failures and how to rerun them:
> https://github.com/Harshyadav442277/miner/tree/main/track2

## Post 1 (final text 2026-11-23 ~23:20 UTC; the owner posts it as a 4-post thread)

Every claim can be checked: registration 210 in `/api/wasm`; #217 and #218 from the decoded public-pair captures
(lane READMEs). Each post is at most 280 characters; X counts a link as 23.

> 1/4 Our evaluator is now the first canonical CONTRACT_OBLIGATION_AUDIT scorer on @Telegraphprotoc testnet: 82.76% on
> 29 hidden pairs (floor 70%).
>
> The fix: train on pairs whose right answer comes from the prompt itself.
>
> Season II hackathon entry, prize-eligible. 1/4

> 2/4 For 3 weeks we held no seat. We gated every evaluator on real miner answers, but in those families which
> service answered predicted the label, so the gate measured the miners, not our scorer. The network judges
> contributors' pool pairs, after a 15-pair public check.

> 3/4 Now each pair's label comes from text in the prompt: contract clauses (CUAD), bill text with its CRS summary,
> DNS responses. The kit's gate rejects length and word shortcuts; the node's public check decides.
>
> Summarization passed it 15/15. Moderation failed 5/15.

> 4/4 Check it yourself: registration 210 at https://devnode.telegraphprotocol.com/api/wasm
>
> Generators, gates and every result, including the failures: https://github.com/Harshyadav442277/miner/tree/PR/evaluators-plan-2026-11-23/track2

## Draft 2: what checking real answers found

> Building @Telegraphprotoc evaluators (Season II hackathon entry, prize-eligible), we labelled thousands of real
> miner answers against primary sources. Some errors are worth knowing if you run a miner:
> - EMAIL_SECURITY: one service reports a name that does not exist as `lookup_ok: true`, in 61 of 300 queries.
>   `lookup_ok` means NOERROR, and NOERROR with no records is still true.
> - VULNERABILITY_TRIAGE: the schema asks for the NVD primary CVSS. On the one pilot CVE where NVD and the vendor
>   (CNA) differ, 12 registrations on one host returned the vendor's score and one service returned NVD's.
>   (3-query pilot: indicative only.)
> - OPTIMAL_EXECUTION_ROUTE: every numeric quote was within 0.25% of the best public aggregator quote (48 quotes, one
>   pair, one six-minute window). The failures were non-answers, not wrong numbers.
>
> These are direct calls to each miner as its YAML declares, not the engine route. We also run a miner on this
> network (LiveCert), and none of the services above is ours.
>
> Reproduce the DNS check in about 15 minutes, with no wallet or key: <repo link to track2/TUTORIAL.md>

## Draft 3: the unranked intents (post only after network evidence exists)

> Two deterministic @Telegraphprotoc intents had not been ranked for days: DNS_RECORD_LOOKUP since epoch 2019 and
> VALIDATOR_PERFORMANCE_VERIFY since 2032. A deterministic intent is ranked against "truth sources", public APIs that
> answer the question. We contributed neutral ones: DNS.SB and NextDNS, and the PublicNode beacon API. Disclosure: our
> own miner serves DNS_RECORD_LOOKUP and was unscored there, so it would be ranked if scoring resumes. The sources are
> public resolvers we don't run, and not the upstreams our miner uses. (Season II entry, prize-eligible.)
> [Before posting: the devnode registry was reset on 2026-11-17 (GAPS G51). Re-check that these intents are still
> unscored, and use epochs from after the reset.]
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
