# Registration 5301 (owner's signature, 2026-11-17): on-chain, not in the node's index

Checked by Claude from Sepolia RPC (publicnode) and the devnode API. The owner signed; Claude did not.

## On-chain (primary source)

| | |
|---|---|
| Transaction | `0xbfb7a37b5ebd4757171239d16ea3dc1b2541e0c0c03dd848eeecf7413faa8b36` |
| Block / time | 12,154,029 / 2026-11-17 11:14:12 UTC |
| From | `0xdad201ef02f5c1fbb8f9e931ae9b7c1bf493a39e` (the LiveCert wallet), to Diamond `0x3624EB01…eb99b` |
| Status | `0x1` (success); selector `0x876b2422` |
| Events | Three Diamond events with topic1 = **5301** (`0x14b5`) and topic2 = our wallet. They use the same event signatures as 5292's registration (`0x7305b0d0…`, `0x1df17049…`, `0x48960f76…`). The first event's data carries YAML hash `bf9dd574…53bab`, fee address `0xdad2…a39e` and min price 10,000 (`0x2710`). A MACHINA transfer from the wallet to the Diamond is in the same tx |

## On the node (16:30 UTC)

- `GET /api/miners/5301` returns `chainsight-oracle` (another team, wallet `0xd4c7…8ef9`), `superseded`, YAML
  `hub.shadrakbessanh.me`. It does not return our registration.
- `livecert` in the catalog is still registration 5292, YAML `04c0e9f`, `active`.
- Ids 5294–5302 near it were all created by the node's import at 09:52 UTC (`registered_at`), after the Nov 17 rebuild.
  So the node's id 5301 was taken by an imported record before our transaction used 5301 on-chain.

## Effect

LiveCert keeps serving under 5292 with the previous YAML, so nothing is down. The new YAML (G328 params, the
`translation` output, the `/sec-filings` description) does not reach the node until it indexes 5301.

## Message to the organisers (owner sends; draft)

> Hi team, possible id collision after the Nov 17 rebuild.
>
> Our `updateMiner`/registration for `livecert` went through on Sepolia at 11:14 UTC: tx
> `0xbfb7a37b5ebd4757171239d16ea3dc1b2541e0c0c03dd848eeecf7413faa8b36`, which emits registration **5301** (owner
> `0xdad2…a39e`, YAML hash `bf9dd574…`).
>
> The devnode's `GET /api/miners/5301` returns a different miner (`chainsight-oracle`, superseded), imported at
> 09:52 UTC, and our new registration is not indexed. LiveCert still serves as 5292 with the previous YAML.
>
> Can the importer pick up 5301 from the chain? Should we re-send instead?

## Not verified

- The node's indexing rules after the rebuild. The id collision is inferred from the node's own records and the
  chain events, not from a statement by the organisers.
