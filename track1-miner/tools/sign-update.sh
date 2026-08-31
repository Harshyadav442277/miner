#!/usr/bin/env bash
# Add WEATHER_CHECK, FACT_CHECK and TELEGRAPH_KNOWLEDGE to the live registration.
#
#   bash track1-miner/tools/sign-update.sh
#
# THIS SCRIPT NEVER SEES YOUR PRIVATE KEY. `cast send --interactive` prompts for
# it directly from your terminal: it is not an argument, so it never reaches this
# script, your shell history, the process list, or any file. Never replace that
# flag with --private-key.
#
# updateMiner deregisters and re-registers ATOMICALLY, so it replaces the whole
# registration and issues a NEW registration id. A bad activation therefore takes
# all ten intents offline, including the five currently at rank 1 — which is why
# every precondition below is checked before anything is signed, and why the call
# is simulated read-only first.
set -uo pipefail

DIAMOND=0x5a2324aA18613FAD4e44bDF0d6c73Ec1f6D87ff8
REG=389
WALLET=0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e
PRICE=10000
RPC=https://sepolia.base.org
NODE=https://devnode.telegraphprotocol.com
REPO=Harshyadav442277/miner
SIG='updateMiner(uint256,string,bytes32,address,uint256,string[])'
INTENTS='["SSL_VERIFICATION","STORM_ALERT","WEATHER_FORECAST","IP_GEOLOCATION","LANGUAGE_TRANSLATION","ACADEMIC_SEARCH","AI_TEXT_DETECTION","CONTENT_EXTRACTION","NEWS_HEADLINES","WALLET_BALANCE_CHECK","WEATHER_CHECK","FACT_CHECK","TELEGRAPH_KNOWLEDGE"]'

cd "$(dirname "$0")/../.." || exit 1
die() { printf '\n  STOP: %s\n' "$1" >&2; exit 1; }
ok()  { printf '  ok    %s\n' "$1"; }

echo "preflight for updateMiner($REG)"
echo

command -v cast >/dev/null 2>&1 || die "cast is not installed. Run:
         curl -L https://foundry.paradigm.xyz | bash && source ~/.bashrc && foundryup"
ok "cast $(cast --version 2>/dev/null | head -1)"

# The manifest must be committed and pushed, because we sign a URL pinned to a
# commit. An uncommitted edit would be signed as something GitHub never serves.
git diff --quiet -- track1-miner/miner.yaml || die "track1-miner/miner.yaml has uncommitted changes. Commit and push first."
SHA=$(git rev-parse HEAD)
URL="https://raw.githubusercontent.com/$REPO/$SHA/track1-miner/miner.yaml"

# Hash the HOSTED bytes, never the local file: the working copy is CRLF and git
# stores LF, so the two hashes genuinely differ and only the hosted one is what
# Telegraph will fetch and compare against the hash we sign.
# Deliberately NOT mktemp: on Git Bash that returns a /tmp/... path that the
# Windows python below cannot open, and the check would fail open.
TMP="./.hosted-manifest.tmp"
trap 'rm -f "$TMP"' EXIT
code=$(curl -sL -m 40 -o "$TMP" -w '%{http_code}' "$URL")
[ "$code" = "200" ] || die "the manifest is not reachable at the pinned commit (HTTP $code).
         Did you push? git push origin main"
HASH=$(sha256sum "$TMP" | cut -d' ' -f1)
BYTES=$(wc -c < "$TMP")
ok "manifest hosted, $BYTES bytes, sha256 $HASH"

python -c "
import yaml,sys
m=yaml.safe_load(open('$TMP',encoding='utf8'))
i=m['semantics']['supported_intents']; e=m['endpoints']
assert len(i)==13, f'expected 13 intents, found {len(i)}'
assert len(e)==12, f'expected 12 endpoints, found {len(e)}'
assert m['base_url']=='https://miner-wine.vercel.app', m['base_url']
" || die "the hosted manifest is not the thirteen-intent manifest."
ok "manifest parses: 13 intents, 12 endpoints"

# One non-canonical string reverts the whole registration. Written to a file
# rather than interpolated: the feed is 45 records of prose and embedding it in
# a python literal is a quoting accident waiting to happen.
CANONF="./.canonical-intents.tmp"
trap 'rm -f "$TMP" "$CANONF"' EXIT
curl -s -m 30 -o "$CANONF" "$NODE/engine/v1/intents" || die "could not read the canonical intent set."
python -c "
import json,sys
d=json.load(open('$CANONF',encoding='utf8'))
rows=d if isinstance(d,list) else (d.get('intents') or d.get('data') or [])
canon={r['intent_id'] for r in rows if isinstance(r,dict) and r.get('canonical')}
if not canon: sys.exit('could not parse the canonical intent set')
want=json.loads('''$INTENTS''')
bad=[w for w in want if w not in canon]
sys.exit('non-canonical: '+', '.join(bad) if bad else 0)
" || die "a declared intent is not canonical — the send would revert."
ok "all 13 intents are canonical"

BAL=$(cast balance "$WALLET" --rpc-url "$RPC" 2>/dev/null || echo 0)
[ "$BAL" != "0" ] || die "no gas on Base Sepolia for $WALLET"
ok "gas available ($(cast from-wei "$BAL") ETH)"

# Read-only simulation. Reverts here cost nothing; reverts on-chain cost the
# whole registration.
echo
echo "  simulating..."
if ! OUT=$(cast call "$DIAMOND" "$SIG" "$REG" "$URL" "0x$HASH" "$WALLET" "$PRICE" "$INTENTS" \
           --from "$WALLET" --rpc-url "$RPC" 2>&1); then
  printf '%s\n' "$OUT" >&2
  die "simulation reverted — nothing was sent."
fi
ok "simulation passed"

cat <<EOF

  About to REPLACE registration $REG. This deregisters and re-registers
  atomically and issues a NEW registration id. If activation fails, all thirteen
  intents go offline — including the four currently at rank 1.

    url    $URL
    hash   0x$HASH
    from   $WALLET

EOF
read -r -p "  Type SIGN to send, anything else to abort: " CONFIRM
[ "$CONFIRM" = "SIGN" ] || die "aborted, nothing sent."

echo
echo "  cast will now prompt for your private key. It is read directly by cast —"
echo "  not by this script, not into your shell history."
echo
cast send "$DIAMOND" "$SIG" "$REG" "$URL" "0x$HASH" "$WALLET" "$PRICE" "$INTENTS" \
  --rpc-url "$RPC" --interactive || die "the send failed. Registration $REG is unchanged."

cat <<EOF

  Sent. Read the NEW registration id from the receipt above, then:

    curl -s $NODE/api/miners/<NEW_ID> | python -m json.tool

  Want: activation_status active, rejection_reason null, 13 supported_intents.
  Then: gh variable set REGISTRATION_ID --body <NEW_ID>
        node track1-miner/tools/preflight.mjs
  And tell the Track 2 session — its disclosure docs still cite $REG.
EOF
