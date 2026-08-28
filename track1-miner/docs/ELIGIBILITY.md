# ELIGIBILITY.md — the guardrail, and what actually clears it

Written 2026-08-28, after epoch 288. Numbers verified live the same day against
`devnode.telegraphprotocol.com`.

**Decided 2026-08-28: we are not registering a second miner ourselves.** That analysis has been
removed rather than left to be re-argued. Recovering it: `git show 2b66add -- track1-miner/docs/ELIGIBILITY.md`.

---

## 1. The rule

> An Intent must have at least **3 active Miners** and receive at least **100 real requests from
> Track 3 applications** to be eligible for global cash prizes.

Two halves, both required. Rank 1 in an intent that fails either half wins nothing. Performance
does not rescue an ineligible intent.

## 2. Where we actually stand

| Intent | Our rank (ep. 288) | Our score | Miners | Miner half | 100-request half |
|---|---|---:|---:|---|---|
| `SSL_VERIFICATION` | **#1** | 0.00935 | 4 | **clear** | not started |
| `STORM_ALERT` | **#1** | 0.01061 | 5 | **clear** | not started |
| `IP_GEOLOCATION` | **#1** | 0.00976 | **2** | **FAILS** | not started |
| `WEATHER_FORECAST` | #3 | 0.00678 | 11 | clear | not started |

**Track 3 has not opened yet.** Nothing we serve today counts toward any intent's 100. That half is
zero everywhere, and it is the half that decides whether the money is real.

## 3. Recruit a real third miner

A third `IP_GEOLOCATION` miner run by someone who is not us makes the intent eligible and is
entirely above board. Competition that unlocks a prize pool is not a loophole — it is the
mechanism working as designed.

The recruiting pitch is unusually strong here, because **an IP geolocation miner needs no code**.
`base_url` points at the upstream API you are wrapping; Telegraph nodes proxy to it. A valid miner
can be pure YAML.

I verified this exact upstream today — keyless, no signup, query-parameter shaped, and it even
returns the abuse fields the scored questions ask about:

```bash
curl "https://api.ipapi.is/?q=8.8.8.8"
# {"ip":"8.8.8.8","is_datacenter":true,"is_vpn":true,"is_abuser":true,
#  "company_name":"Google LLC","cc":"US","lat":37.38605,"lon":-122.08385}
```

Which makes a complete miner roughly this:

```yaml
version: "1"
kind: miner
id: <any unused integer>
slug: <any unused slug>
protocol: generic
name: <their name for it>
description: >-
  Live IP address geolocation and reputation. Returns country, city, coordinates,
  the operating company and ASN, and whether the address is a datacenter, VPN,
  proxy or known abuser.
base_url: https://api.ipapi.is

endpoints:
  - path: /
    external_path: /
    method: GET
    description: Geolocation and reputation for one IPv4 or IPv6 address.

semantics:
  signal_mapping:
    label_field: cc
  supported_intents:
    - IP_GEOLOCATION
```

**Do not hand anyone a pre-filled file with our wallet, our slug, or our host in it.** Send them
this document and let them fill in their own. A miner they configured, funded and signed is a real
third miner. One we assembled and they clicked is the same sockpuppet with extra steps.

### The 20-minute path, for whoever takes it up

1. **Wallet** — MetaMask, new wallet, Base Sepolia (chain ID `84532`, RPC `https://sepolia.base.org`).
2. **Gas** — free testnet ETH from `alchemy.com/faucets/base-sepolia`. There is no bond or stake;
   registration is one transaction.
3. **Pick a free slug and id** — both must be unused:
   ```bash
   curl -s https://devnode.telegraphprotocol.com/api/miners | grep -o '"slug":"[^"]*"'
   ```
4. **Check the intent string is canonical** — one wrong string reverts the whole registration:
   ```bash
   curl -s https://devnode.telegraphprotocol.com/engine/v1/intents
   ```
5. **Sandbox first.** `integrate.telegraphprotocol.com` → Connect → Import & Upload → the YAML →
   **REQUIRES API KEY off** → Validate. Registration is effectively immutable and a rejection
   releases the slug, so nothing gets signed before this is clean.
6. **Sign** `registerMiner`, then confirm activation:
   ```bash
   curl -s https://devnode.telegraphprotocol.com/api/miners/<registrationId> \
     | jq '.miner | {activation_status, rejection_reason}'
   ```

Where to ask: the hackathon Discord, and replies under Telegraph's own posts. The honest framing is
the whole pitch — *an intent is one miner short of being prize-eligible, it takes twenty minutes
and no code, and here is the working YAML.* People join a live prize pool. They do not join a
favour.

## 4. The half that actually decides this — 100 real requests

No account can be created to fix this one. It needs applications making genuine calls.

- **CertWatch** (`track3-certwatch/`) is our own recurring SSL need. Its durable-history bug is
  fixed as of today — the sweep's record is tracked in git and readable at the raw URL, so paid
  results survive a cold start instead of vanishing. It still needs a funded wallet and, more
  importantly, **users who are not us**.
- **Storm needs an outside integrator** — a weather, travel, logistics or field-ops app. Publish an
  integration recipe and support whoever picks it up.
- Requests must come from real usage. Looping questions to reach 100 is the same red line as §3,
  and it fails for the same reason.

Note the ordering this implies: SSL and Storm already clear the miner half, so they are the only
two intents where the 100 requests would immediately convert into an eligible rank 1. That is where
outreach effort pays first — not IP.

## 5. One thing still unresolved

The published rules do not define how the 25% X term is applied across multiple intent entries, or
whether ineligible intents are excluded from the "total normalized scores across all intents" that
decides winners. We are optimising against an underspecified formula. **Worth asking the organizers
in writing**, and worth doing before the 31st rather than after.
