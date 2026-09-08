/**
 * TELEGRAPH_KNOWLEDGE — questions about Telegraph itself, answered from the
 * protocol's own live state and from facts this repository has verified.
 *
 * The canonical intent covers the protocol, the Explorer and its leaderboard,
 * miner registration and the YAML registry, intents, the hackathon, and
 * applications built on Telegraph. Most of that is not static trivia — it is
 * **live state we already query every day** to operate this miner, so the honest
 * answer is a current one rather than a remembered one.
 *
 * **Why this intent is open.** It has had exactly one miner across 294 epochs,
 * `telegraph-chatbot`, whose registered `base_url` is `http://127.0.0.1:8080` —
 * a loopback address the Telegraph node cannot reach from anywhere. It is not
 * losing, it is unreachable by construction, and it scored 0.0000 in each of
 * the last two epochs.
 *
 * **The honesty rule here is the same as everywhere else in this miner.** Live
 * facts are read live and attributed. Facts that are stable and verified are
 * answered from the record in `docs/TELEGRAPH_FACTS.md`, which carries sources
 * and check dates. A question this cannot answer gets an honest "not covered"
 * rather than an invented one — the protocol's own documentation is the right
 * place to send someone, and pretending otherwise would be the confidently
 * wrong failure this project refuses everywhere else.
 */

const NODE = "https://devnode.telegraphprotocol.com";
const DEFAULT_TIMEOUT_MS = 7000;

export interface TelegraphResult {
  topic: string;
  verdict: string;
  confidence: number;
  reason: string;
  source: string;
  checked_at: string;
  error?: string;
}

/**
 * Stable, verified protocol facts.
 *
 * Every entry here is recorded in `docs/TELEGRAPH_FACTS.md` with a source and a
 * date, per this project's rule that protocol facts are checked against live
 * docs rather than recalled. Nothing speculative belongs in this table.
 */
/**
 * Words that place a question inside Telegraph. The entries added on 2026-09-08
 * carry broad vocabulary ("docs", "website", "nodes", "subscribe") that also
 * occurs in the open-domain questions the Daemon routes here by mistake (GAPS
 * G71: 97% of routed TELEGRAPH_KNOWLEDGE questions are not about Telegraph), so
 * those entries fire only when the question also names something of Telegraph's.
 * Answering "Will the .name domain website terminate?" with a paragraph about
 * docs.telegraphprotocol.com would be the confidently-wrong answer this miner
 * refuses everywhere else.
 */
const TELEGRAPH_CONTEXT =
  /\btelegraph\b|\bminers?\b|\bprotocol\b|\bintents?\b|\bexplorer\b|\bsignals?\b|\bx402\b|\bmcp\b|\bdaemon\b|\bdispatcher\b|\bsubnets?\b|\bvalidators?\b|\bdevnode\b|\bregistr|\bepochs?\b|\busdc\b|\bmachina\b|\balexandria\b|\bscor(?:ing|er|es)\b|\byaml\b|\bmanifest\b|\bengine\b|\brout(?:ed|ing)\b|\bescrow\b|\bpaid calls?\b/i;

const FACTS: Array<{ match: RegExp; topic: string; text: string; context?: RegExp }> = [
  // Before `miner registration`: "can I update a miner after registering it" is a
  // question about updating, and the registration entry would otherwise claim it on
  // the word "registering".
  {
    match: /\bupdate\b.*\b(miner|registration|manifest|intents?|endpoint)\b|\bupdate.?miner\b|\bre-?register\b|\bchange\b.*\b(intents?|endpoint|manifest)\b/i,
    topic: "updating",
    text:
      "updateMiner(oldRegistrationId, ...) deregisters and re-registers a miner atomically. It " +
      "issues a new registrationId and a new intentId, so anything holding the old intentId " +
      "breaks. Only the address that registered a miner may update or deregister it, and there " +
      "is no admin override.",
  },
  {
    match: /\bregist(er|ration|ering)\b|\bminer\.?yaml\b|\byaml\b|\bmanifest\b|\bintegrate\b|\bhow.*(add|list).*miner\b|\bschema\b/i,
    topic: "miner registration",
    text:
      "A Telegraph miner is registered by publishing a YAML manifest describing an existing HTTP " +
      "API and recording it on-chain. The manifest declares a base_url, one endpoint per intent, " +
      "an input schema, an output schema and the supported intents. It is pinned at a public URL " +
      "and its SHA-256 hash is stored on chain, so the served bytes and the registration must " +
      "match exactly. The Miner YAML Registry at integrate.telegraphprotocol.com validates a " +
      "manifest and sandbox-tests every declared endpoint before registration. Registration is " +
      "permissionless and free apart from gas on Base Sepolia; there is no bond or stake.",
  },
  {
    match: /\bscor(ing|er|es|ed|e)\b|\bwasm\b|\bground truth\b|\bconverted answer\b|\bevaluat/i,
    topic: "scoring",
    text:
      "Telegraph scores miners with WASM scoring modules, one per intent. A module receives the " +
      "question, a ground truth and the miner's answer, and returns a score. The text actually " +
      "compared is a converted answer: the node summarises the whole miner payload into a short " +
      "third-person passage, so every field a miner returns becomes scored surface, not just the " +
      "one it considers its answer. Scores are published per epoch on the public score feed, and " +
      "a miner's position in an intent is its Canonical Score, the stake-weighted median of " +
      "validator local scores from the last epoch tournament plus spot checks.",
  },
  {
    match: /\bepoch/i,
    topic: "epochs",
    text:
      "A Telegraph epoch is nine hours long, so scoring lands roughly three times a day rather " +
      "than continuously. Each epoch runs a tournament that scores every registered miner in " +
      "every intent it declares, and the resulting per-intent ranking sets how routed traffic is " +
      "shared until the next epoch. A change deployed just after an epoch is scored therefore " +
      "does not show up for up to nine hours.",
  },
  {
    match: /\brout(e|es|ed|ing)\b|\brank(s|ing|ed)?\b|\bcanonical score\b|\bleaderboard\b.*\bposition\b|\bwinner.?take|\btraffic\b|\bshare\b/i,
    topic: "routing",
    text:
      "Telegraph routing is winner-take-most. Within each intent the rank-1 miner receives about " +
      "70% of routed requests, rank 2 about 20% and rank 3 about 10%; rank 4 and below receive " +
      "nothing. Those shares are governance-adjustable and were 70/20/10 at genesis. Position is " +
      "the Canonical Score, the stake-weighted median of validator local scores from the last " +
      "epoch tournament plus spot checks. The practical consequence is that rank 1 in a quiet " +
      "intent is worth far more than rank 4 in a crowded one.",
  },
  {
    match: /\bearn|\bpay(ment|ments|s|out|outs)?\b|\bprice\b|\busdc\b|\bmachina\b|\brevenue\b|\bemission|\bmonet|\bcost\b|\b402\b|\bfee\b/i,
    topic: "economics",
    text:
      "Miners earn only from demand — Telegraph has no protocol emissions. A routed query is " +
      "payment-gated: POST /engine/v1/ask returns HTTP 402 without a payment payload, and the " +
      "advertised price is $0.01 USDC per request on Base Sepolia, paid to the protocol's Diamond " +
      "contract. Of what an agent pays, 2% goes to the treasury and 98% into a TWAP escrow that " +
      "is dripped into Uniswap V3 over 24 hours, with MACHINA sent to the miner's fee address. At " +
      "least 100 USDC must accumulate before a settlement cycle runs. Earnings are the miner's " +
      "min_price_usdc multiplied by a demand multiplier that rises with 24-hour request volume, " +
      "times 0.98. The minimum min_price_usdc is 10000, which is $0.01.",
  },
  {
    match: /\bgrace period\b|\bnew(ly)? (registered )?miner\b|\bfirst (7|seven) days\b/i,
    topic: "grace period",
    text:
      "For the first seven days after activation a miner is in the grace period, during which all " +
      "grace-period miners share 5% of routed traffic equally, and the grace-period score sets " +
      "the opening leaderboard position. The grace period throttles routed traffic; it does not " +
      "withhold scoring or ranking. A new registration is scored in the next epoch's pass, so " +
      "there is no ranking blackout.",
  },
  {
    match: /\bspot.?check|\brevocation\b|\brevoke|\buptime\b|\blatency\b|\bslash|\bdowntime\b|\boffline\b|\bgoes down\b|\bstops? responding\b/i,
    topic: "spot checks",
    text:
      "Validators spot-check miners roughly every 20 seconds, triggered deterministically by the " +
      "latest Base L2 block hash. If a spot-check score falls more than 20% below the miner's " +
      "leaderboard score the result is immediate routing revocation: the miner is removed from " +
      "the routing table, its traffic is redistributed, the event is recorded immutably in the " +
      "epoch block, and no new traffic arrives until the next epoch tournament re-scores it. " +
      "Uptime and latency are therefore part of the product rather than hygiene.",
  },
  {
    match: /\bactivat|\bunreachable\b|\bpending\b|\brejected\b|\brejection\b|\bdereg|\bsuperseded\b|\bactivation_status\b/i,
    topic: "activation",
    text:
      "Nodes activate a miner on the MinerRegistered event, usually within a minute, and " +
      "activation is not epoch-gated. A registration's activation_status is active when it is " +
      "live and routable, pending while it is activating, unreachable when the YAML URL did not " +
      "answer (the node retries about every five minutes, up to five times), rejected when it is " +
      "terminally invalid, superseded when a newer registration took the slug, and deregistered " +
      "when it was withdrawn on-chain. A rejection releases the slug immediately, so it can be " +
      "claimed by anyone. Registrations should be looked up by registrationId rather than slug, " +
      "because a slug lookup returns whoever currently serves it.",
  },
  {
    match: /\bcontract\b|\bdiamond\b|\bon.?chain\b|\bbase sepolia\b|\bsha-?256\b|\bkeccak\b|\bblockchain\b|\bsolidity\b/i,
    topic: "contract",
    text:
      "Telegraph's registry is a Diamond contract on Base Sepolia at " +
      "0x5a2324aA18613FAD4e44bDF0d6c73Ec1f6D87ff8. Miners are created with " +
      "registerMiner(string yamlUrl, bytes32 yamlHash, address feeAddress, uint256 " +
      "minPriceUsdc, string[] supportedIntents). The yamlHash is the SHA-256 of the raw YAML " +
      "bytes, 0x-prefixed — not keccak256. Every declared intent must be canonical exactly and " +
      "case-sensitively, or the whole transaction reverts.",
  },
  {
    match: /\bapi key\b|\bslug\b|\bcredential|\bsecret\b|\bsign(ing|ature)?\b|\beip-?191\b/i,
    topic: "identity",
    text:
      "A Telegraph slug is bound to a wallet, and only the wallet holding it may register it. " +
      "API keys never go in the YAML manifest, which is public, pinned and hashed on-chain; they " +
      "are installed against the slug after registration through an EIP-191 personal_sign " +
      "challenge. The key is bound to the wallet rather than the slug, so a slug changing hands " +
      "transfers no credentials.",
  },
  {
    match: /\bintent/i,
    topic: "intents",
    text:
      "An intent is the canonical category a question is routed by, such as SSL_VERIFICATION or " +
      "WEATHER_FORECAST. The canonical set lives on chain and can change, so it is read from the " +
      "protocol rather than assumed. A miner declares which intents it serves, and one endpoint " +
      "may serve more than one. Declaring an intent string that is not canonical causes the whole " +
      "registration to revert. Miners are ranked separately within each intent they declare.",
  },
  {
    match: /\bexplorer\b|\bleaderboard\b|\blive feed\b|\bsignal search\b|\bdashboard\b/i,
    topic: "explorer",
    text:
      "The Telegraph Explorer at explorer.telegraphprotocol.com shows the live miner leaderboard, " +
      "a live feed of routed requests and signal search. Per-intent rankings and epoch scores are " +
      "also available from the public score feed on the dev node at " +
      "devnode.telegraphprotocol.com, alongside the miner catalog and the canonical intent list.",
  },
  {
    match: /\bhackathon\b|\btrack\s*[123]\b|\bprize|\bjudg/i,
    topic: "hackathon",
    text:
      "The Telegraph Hackathon runs three tracks: Track 1 for miners, Track 2 for scoring-module " +
      "authors and Track 3 for applications built on the protocol. Track 1 is judged on " +
      "normalized performance within each intent plus engagement, and an intent must have enough " +
      "active miners and real application traffic to be eligible for prizes.",
  },
  {
    match: /\bdaemon\b|\bsignal(s)?\b|\bcollector\b/i,
    topic: "daemon",
    text:
      "The Telegraph Daemon generates questions from collectors, routes each one to the miner " +
      "that serves its intent, and publishes the result as a signal with a signal_hash. Its " +
      "pushes run on a roughly three-hour cycle, and the routed questions, the chosen miner and " +
      "the returned answer are all visible in the Explorer's live feed.",
  },
  {
    match: /\balexandria\b/i,
    topic: "alexandria",
    text:
      "Alexandria is Telegraph's flagship intelligence layer, the product surface built on top of " +
      "the miner network and its routed answers.",
  },
  // The entries below were added 2026-09-08 (GAPS G71). They sit AFTER every
  // specific entry above, so a question an earlier entry already answered keeps
  // that answer, and BEFORE the catch-all so they only take questions that used
  // to fall through to the generic description or to `not_covered`. Every fact
  // is from docs/TELEGRAPH_FACTS.md § "Consumer surfaces" and § "Routing".
  {
    match:
      /\bdirect(?:ly)?\b|\bdispatcher\b|\bask\/:?id\b|\bspecific miner\b|\bcall(?:ing)? (?:a |one |the |my )?(?:particular |named |single )?miner\b|\bminer.?id\b|\bnumeric id\b|\bby id\b|\bsubnets?\b/i,
    topic: "direct calls",
    context: TELEGRAPH_CONTEXT,
    text:
      "A caller can address a specific miner instead of letting the router choose. POST " +
      "/engine/v1/ask/:id on the node takes the miner's numeric id from /api/miners (LiveCert is " +
      "4433, which is not its registration id) with a body naming the method, the endpoint path " +
      "and the payload. It is x402-gated like the routed ask; the node runs the same pre-request " +
      "validation but halts instead of falling back, because the caller named the miner, and the " +
      "response carries miner_id, result, cost_usd, duration_ms and a signal_hash. In the node's " +
      "API a registered miner is also called a subnet: list_subnets, ask_subnet and the miner " +
      "dispatcher, POST /miner-dispatcher/v1/<minerId>/<endpoint>, all refer to miners, and the " +
      "node publishes that whole surface as OpenAPI at /miner-dispatcher/openapi.json. A direct " +
      "call reaches the miner regardless of its rank.",
  },
  {
    match: /\bmcp\b|\bmodel context protocol\b|\bclaude desktop\b|\bcursor\b|\bagent tools?\b/i,
    topic: "mcp",
    context: TELEGRAPH_CONTEXT,
    text:
      "Telegraph ships an MCP server, the npm package telegraph-protocol-mcp, listed on the MCP " +
      "Registry as io.github.telegraphprotocol/telegraph. It runs locally on Node 20 or newer, " +
      "configured with TELEGRAPH_NODE_URL, TELEGRAPH_ENGINE_URL and TELEGRAPH_DAEMON_URL plus a " +
      "burner EVM private key for payments. It exposes free node and daemon reads such as " +
      "tg_node_list_subnets and tg_daemon_questions, the paid tg_engine_ask for routed questions " +
      "and tg_engine_ask_subnet for a direct call, and one auto-generated tool per miner endpoint " +
      "named tg_<slug>_<path>, refreshed every five minutes from the miner catalog, so every " +
      "registered miner is reachable from any MCP client with no work on the miner's side.",
  },
  {
    match: /\bwebsockets?\b|\bwss?:\/\/|\bsubscri(?:be|ption|ptions)\b|\bescrow\b|\bpush(?:ed)? signals?\b|\bstream(?:ing)? (?:of )?signals?\b/i,
    topic: "websocket",
    context: TELEGRAPH_CONTEXT,
    text:
      "Telegraph pushes signals over a WebSocket at wss://devnode.telegraphprotocol.com/engine/ws. " +
      "An anonymous connection can only list subnets and ping; everything else needs a wallet " +
      "address on the connection, a personal_sign challenge answered within 15 seconds, and at " +
      "least 1 USDC deposited in escrow through EscrowFacet.depositUSDC on the Diamond contract. A " +
      "wallet holds one subscription naming intents, a per-session spend limit and optional " +
      "category, minimum-interest and hourly caps; ask and ask_direct also work over the socket " +
      "with no x402 charge at that layer. Pushed signals come from the Daemon's roughly three-hour " +
      "cycle in batches, are settled against escrow per signal at the intent's price, and reaching " +
      "the spend limit cancels the subscription and closes the socket.",
  },
  {
    match:
      /\bx402\b|\bpayment[- ]required\b|\bhow (?:do|can|does|would) (?:i|you|we|an? )?(?:agents?|apps?|applications?|callers?|users?)? ?pay\b|\bpay(?:ing)? for (?:a |an |the )?(?:query|request|answer|call|signal)\b|\bverify (?:a |the |my )?(?:signal|answer|result|response)\b|\bhttp 402\b|\bpaid calls?\b/i,
    topic: "x402",
    context: TELEGRAPH_CONTEXT,
    text:
      "Telegraph charges for routed and direct answers with x402: a request without payment gets " +
      "HTTP 402 and a PAYMENT-REQUIRED header whose decoded amount and payTo address are " +
      "authoritative. The price is the miner's floor, min_price_usdc in 6-decimal units where 10000 " +
      "is $0.01, times a demand multiplier from the intent's 24-hour volume, payable in USDC on Base " +
      "Sepolia or Solana Devnet. Failed calls are never charged. Every paid call returns a " +
      "signal_hash, and GET /engine/v1/signal/{hash} returns the signal, the result and the hashed " +
      "payload so a consumer can verify the answer independently. The x402 client needs Node 20 " +
      "or newer.",
  },
  {
    match:
      /\bbuild(?:ing)? (?:an? |my |your |the )?(?:app|application|agent|bot|product|client)\b|\b(?:example|reference|sample|demo) (?:apps?|applications?|code|projects?)\b|\buse ?cases?\b|\btruthwire\b|\btrustfilter\b|\bscholarguard\b|\breviewradar\b|\badguard\b|\bsupersignal\b|\bconsume\b|\bconsumers?\b/i,
    topic: "applications",
    context: TELEGRAPH_CONTEXT,
    text:
      "An application consumes Telegraph through one of three paths: the auto-routed POST " +
      "/engine/v1/ask, where the router classifies the question into an intent and picks a ranked " +
      "miner; a direct call to a named miner by its numeric id; or the MCP server's tools. The " +
      "organisers' reference applications, TruthWire, TrustFilter, ScholarGuard, ReviewRadar, " +
      "SuperSignal and AdGuard, live in the telegraph-truthwire and telegraph-usecases repositories " +
      "on GitHub and call miners through the dispatcher with an x402 fetch wrapper. Track 3 of the " +
      "hackathon is for applications built this way, and an intent needs real requests from such " +
      "applications to be prize-eligible.",
  },
  {
    match: /\bvalidators?\b|\bnodes?\b|\bdevnode\b|\bconsensus\b|\bstake[sd]?\b|\bstake-?weighted\b|\bwho (?:scores|checks|verifies|ranks)\b/i,
    topic: "validators",
    context: TELEGRAPH_CONTEXT,
    text:
      "Telegraph nodes run the engine: they route a question to a miner, proxy the call, convert the " +
      "miner's payload into a short prose answer and score it with the intent's WASM module. " +
      "Validators spot-check miners roughly every 20 seconds, seeded by the latest Base L2 block " +
      "hash, and each keeps local scores; a miner's Canonical Score is the stake-weighted median of " +
      "validator local scores from the last epoch tournament plus those spot checks, and that score " +
      "sets its rank and its share of routed traffic. The public dev node is " +
      "devnode.telegraphprotocol.com, which serves the miner catalog, the intent list and the score " +
      "feed.",
  },
  {
    match: /\bdocs?\b|\bdocumentation\b|\bwhere (?:can|do|should) i (?:read|learn|find|look)\b|\bofficial (?:site|website|guide)\b|\bwebsite\b|\bconsole\b|\bget(?:ting)? started\b/i,
    topic: "documentation",
    context: TELEGRAPH_CONTEXT,
    text:
      "Telegraph's documentation is at docs.telegraphprotocol.com. The Explorer at " +
      "explorer.telegraphprotocol.com shows the leaderboard, the live signal feed and the score " +
      "history; the Miner YAML Registry console at integrate.telegraphprotocol.com validates and " +
      "registers a miner and shows how to integrate as a consumer; the hackathon rules and tracks " +
      "are at hackathon.telegraphprotocol.com; and the public dev node at " +
      "devnode.telegraphprotocol.com serves the miner catalog, the canonical intent list and the " +
      "per-epoch scores.",
  },
  {
    match: /\btelegraph\b|\bprotocol\b|\bnetwork\b|\bminer\b|\bsubnet\b|\bwhat can you do\b|\bwho are you\b|\bhow can i use you\b|\bwhat are you\b/i,
    topic: "telegraph",
    text:
      "Telegraph is a decentralised network that routes a question to whichever registered miner " +
      "serves its intent, scores every miner's answer each epoch against a ground truth using a " +
      "per-intent WASM scoring module, and ranks miners within each intent. It is a declarative " +
      "standard: instead of writing a service, a miner publishes a YAML manifest describing an " +
      "existing HTTP API, and Telegraph nodes proxy routed requests to it, so a miner can be pure " +
      "YAML with no code. Registration is permissionless and recorded on-chain on Base Sepolia. " +
      "Routed queries are paid in USDC, miners earn only from demand, and rank 1 in an intent " +
      "receives about 70% of its routed traffic. Telegraph can be used by registering a miner " +
      "that wraps an API, by authoring a WASM scoring module, or by building an application that " +
      "consumes routed answers.",
  },
];

async function getJson(url: string, timeoutMs: number): Promise<unknown> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ac.signal, headers: { accept: "application/json" } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Live answers, for the questions whose truth changes by the hour. */
async function liveAnswer(q: string, timeoutMs: number): Promise<{ topic: string; text: string } | null> {
  const wantsMiners = /\b(how many|which|list|current|active)\b.*\bminers?\b|\bminer count\b/i.test(q);
  const wantsIntents = /\bhow many\b.*\bintents?\b|\blist\b.*\bintents?\b/i.test(q);
  const namedIntent = q.match(/\b([A-Z][A-Z_]{4,})\b/)?.[1];

  if (wantsIntents || (namedIntent && /\bminers?\b/i.test(q))) {
    const d = await getJson(`${NODE}/engine/v1/intents`, timeoutMs);
    const rows = (Array.isArray(d) ? d : (d as { intents?: unknown[] })?.intents ?? []) as Array<Record<string, unknown>>;
    if (rows.length) {
      if (namedIntent) {
        const hit = rows.find((r) => r["intent_id"] === namedIntent);
        if (hit) {
          return {
            topic: "intents",
            text:
              `The intent ${namedIntent} is currently served by ${hit["miner_count"]} registered ` +
              `miners on Telegraph. ${String(hit["description"] ?? "")}`.trim(),
          };
        }
      }
      return {
        topic: "intents",
        text:
          `Telegraph currently defines ${rows.length} canonical intents, read live from the ` +
          `protocol. They cover categories such as SSL_VERIFICATION, WEATHER_FORECAST, ` +
          `IP_GEOLOCATION, ACADEMIC_SEARCH and WALLET_BALANCE_CHECK, and the canonical set is ` +
          `held on chain rather than in any miner.`,
      };
    }
  }

  if (wantsMiners) {
    const d = await getJson(`${NODE}/api/miners`, timeoutMs);
    const rows = (Array.isArray(d) ? d : (d as { miners?: unknown[] })?.miners ?? []) as Array<Record<string, unknown>>;
    if (rows.length) {
      return {
        topic: "miners",
        text:
          `There are currently ${rows.length} miners registered on Telegraph, read live from the ` +
          `public miner catalog. Each declares a base URL, the intents it serves and a pinned ` +
          `YAML manifest whose hash is recorded on chain.`,
      };
    }
  }
  return null;
}

export async function answerTelegraph(question: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<TelegraphResult> {
  const now = new Date().toISOString();
  const q = String(question ?? "").trim();
  const base: TelegraphResult = {
    topic: "telegraph", verdict: "unknown", confidence: 0, reason: "",
    source: "Telegraph protocol", checked_at: now,
  };

  if (!q) {
    return {
      ...base,
      reason:
        "No question was supplied with this request, so nothing about Telegraph could be " +
        "answered. Ask about the protocol, miner registration, intents, scoring, the Explorer " +
        "or the hackathon.",
      error: "invalid_input",
    };
  }

  // Live state first: it is the half of this intent that goes stale.
  const live = await liveAnswer(q, timeoutMs);
  if (live) {
    return { ...base, topic: live.topic, verdict: live.topic, confidence: 0.9, reason: live.text, source: "Telegraph dev node, read live" };
  }

  const fact = FACTS.find((f) => f.match.test(q) && (!f.context || f.context.test(q)));
  if (fact) {
    return { ...base, topic: fact.topic, verdict: fact.topic, confidence: 0.85, reason: fact.text, source: "Telegraph protocol documentation" };
  }

  // Nothing invented. Saying where the answer lives is more useful than a guess.
  return {
    ...base,
    verdict: "not_covered",
    confidence: 0,
    reason:
      `This question about Telegraph is outside the areas this miner answers from verified ` +
      `sources, which are miner registration and the YAML registry, intents and the canonical ` +
      `set, scoring modules and how answers are scored, the Explorer and leaderboard, and the ` +
      `hackathon tracks. The protocol documentation at docs.telegraphprotocol.com is the ` +
      `authoritative source for anything beyond those.`,
  };
}
