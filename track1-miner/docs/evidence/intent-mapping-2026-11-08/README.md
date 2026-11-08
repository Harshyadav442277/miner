# intent_mapping evidence, 2026-11-08 23:45 UTC

- `yaml-config-intent-mapping.txt`: the "Intent mapping (optional)" section of
  https://anjoman.ai/docs/miners/yaml-config ("Updated November 5, 2026"), text taken from the server-rendered
  HTML fetched with `curl -s -4 -A "Mozilla/5.0 ..."`. The syntax in miner.yaml follows it.
- Working examples: 155 of the 2,065 registrations in https://devnode.telegraphprotocol.com/api/miners have an
  `intent_mapping` in their `yaml_url`, all `active`. Keys seen: `endpoint`, `output`, `input`, `vars`; output
  specs `path`, `unit`, `how`. 18 entries have no `input`, all in registration 501 (active, ranked 1st on
  FINANCIAL_DATA_GENERAL at epoch 2044); its yaml_url is not pinned to a commit, so the bytes it registered are
  not proven.
- `response-fields.json`: `response.fields` of each of the 43 supported intents, from
  `GET https://devnode.telegraphprotocol.com/engine/v1/intents/<id>`.
- `answers.json`: 72 production answers (https://miner-wine.vercel.app, `?query=` only), one or two realistic
  questions per intent, `receipt` blocks removed. `miner/test/intent-mapping.test.ts` checks every mapped path
  against these.
