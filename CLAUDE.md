# CLAUDE.md — Telegraph miner operating rules

**Goal:** register and operate a Telegraph miner that reaches rank 1 in its intents
(Telegraph Hackathon Season I, Track 1).

**Deadlines, in UTC — resolve them with `date -u`, never the local date.** Track 1 and Track 2 ran
**Aug 17 - Aug 31 2026, closing Aug 31 23:59 UTC**; Track 3 runs Aug 31 - Sep 7; Winner Selection
Sep 8-18. The site's "SEP 7 23:59 UTC" countdown is **Track 3's**, not Track 1's. Post-close, what
is judged is the miner staying **live and ranked through Sep 7**. A local-date reading of this
nearly cost the last three hours of Track 1 - see the correction in docs/TELEGRAPH_FACTS.md.

**Track 2 pivot (2026-08-27):** active build focus is **Track 2 (Script Author)** — rank 1 by
**2026-08-31**. Its rules and state live in [track2/](track2/CLAUDE.md) (own MEMORY, TASKS,
GAPS, ARCHITECTURE). The Track 1 miner stays live per the rules; this file still governs it.

**Not this project:** the Midnight / Brainwave hackathon (NightSeal) is separate and unrelated.

## Docs — read at session start, keep current

- [MEMORY.md](MEMORY.md) — session continuity. **Read FIRST**, update at session end.
- [PRD.md](PRD.md) — scope and open decisions D1–D4.
- [ARCHITECTURE.md](ARCHITECTURE.md) — decisions A1–A10. Conform, or update it before deviating.
- [TASKS.md](TASKS.md) — execution board. One task = one change = one commit.
- [GAPS.md](GAPS.md) — honesty ledger. Feeds the README's Assumptions & Limitations.
- [docs/TELEGRAPH_FACTS.md](docs/TELEGRAPH_FACTS.md) — verified protocol facts, with sources+dates.
- [docs/BUILD_IN_PUBLIC.md](docs/BUILD_IN_PUBLIC.md) — the X cadence. Judged, not optional.

## Hard rules

1. **Claude never touches the wallet.** No connecting, no signing, no sending transactions, no
   entering credentials or seed phrases. Claude prepares and validates; the **user** clicks.
2. **Never commit secrets.** No API key, seed, or private key in any tracked file — including the
   miner YAML, which is public, pinned to IPFS, and hashed on-chain. `.env` is gitignored from the
   first commit.
3. **Sandbox-validate before every on-chain send.** No `registerMiner` / `updateMiner` without a
   clean run at `integrate.telegraphprotocol.com` first. Registration is effectively immutable and
   a rejection releases the slug to anyone.
4. **Verify protocol facts against live docs**, never memory — https://docs.telegraphprotocol.com.
   The canonical intent set changes on-chain. Record what was checked, and when, in
   docs/TELEGRAPH_FACTS.md.
5. **Look up registrations by `registrationId`, never by slug.** By-slug returns whoever currently
   serves that slug, which may not be us.
6. **Commit messages describe the change and nothing else** — no attribution or generated-by lines
   of any kind.

## Useful commands

```bash
# per-intent miner counts — the input to the intent decision
curl https://devnode.telegraphprotocol.com/engine/v1/intents

# current miner catalog — check a numeric id is unused before claiming it
curl https://devnode.telegraphprotocol.com/api/miners

# our registration's health
curl -s https://devnode.telegraphprotocol.com/api/miners/<registrationId> \
  | jq '.miner | {activation_status, rejection_reason, retrying}'

# canonical-intent check — one bad string reverts the whole registration
cast call "$DIAMOND" "isCanonicalIntent(string)(bool)" "WEATHER_CHECK" --rpc-url "$RPC"
cast call "$DIAMOND" "getCanonicalIntents()(string[])" --rpc-url "$RPC"

# YAML hash for registration — SHA-256, NOT keccak256.
# PowerShell is the default shell here and has no sha256sum:
#   (Get-FileHash track1-miner/miner.yaml -Algorithm SHA256).Hash.ToLower()
sha256sum track1-miner/miner.yaml | awk '{print "0x"$1}'   # Git Bash only
```

## Standing orders

1. Session start: read MEMORY.md → ARCHITECTURE.md → top unchecked TASKS.md item.
2. Prefer deletion to addition. Boring, explicit code. Files under ~300 lines.
3. Anything unverified goes in GAPS.md rather than being rounded off to "fine."
4. Session end: update MEMORY.md, GAPS.md, TASKS.md; commit.
