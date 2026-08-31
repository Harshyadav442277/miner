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
const FACTS: Array<{ match: RegExp; topic: string; text: string }> = [
  {
    match: /\bregist(er|ration)\b|\bminer\.?yaml\b|\byaml registry\b|\bintegrate\b|\bhow.*(add|list).*miner\b/i,
    topic: "miner registration",
    text:
      "A Telegraph miner is registered by publishing a YAML manifest describing an existing HTTP " +
      "API and recording it on-chain. The manifest declares a base_url, one endpoint per intent, " +
      "an input schema, an output schema and the supported intents. It is pinned at a public URL " +
      "and its SHA-256 hash is stored on chain, so the served bytes and the registration must " +
      "match exactly. The Miner YAML Registry at integrate.telegraphprotocol.com validates a " +
      "manifest and sandbox-tests every declared endpoint before registration.",
  },
  {
    match: /\bscor(ing|er|e)\b.*\bmodul|wasm\b|\bhow.*scored\b|\bscoring work/i,
    topic: "scoring",
    text:
      "Telegraph scores miners with WASM scoring modules, one per intent. A module receives the " +
      "question, a ground truth and the miner's answer, and returns a score. The text actually " +
      "compared is a converted answer: the node summarises the whole miner payload into a short " +
      "third-person passage, so every field a miner returns becomes scored surface, not just the " +
      "one it considers its answer. Scores are published per epoch on the public score feed.",
  },
  {
    match: /\bintent(s)?\b.*\b(what|which|list|canonical)\b|\bcanonical intent/i,
    topic: "intents",
    text:
      "An intent is the canonical category a question is routed by, such as SSL_VERIFICATION or " +
      "WEATHER_FORECAST. The canonical set lives on chain and can change, so it is read from the " +
      "protocol rather than assumed. A miner declares which intents it serves, and one endpoint " +
      "may serve more than one. Declaring an intent string that is not canonical causes the whole " +
      "registration to revert.",
  },
  {
    match: /\bexplorer\b|\bleaderboard\b|\blive feed\b|\bsignal search\b/i,
    topic: "explorer",
    text:
      "The Telegraph Explorer at explorer.telegraphprotocol.com shows the live miner leaderboard, " +
      "a live feed of routed requests and signal search. Per-intent rankings and epoch scores are " +
      "also available from the public score feed on the dev node.",
  },
  {
    match: /\bhackathon\b|\btrack\s*[123]\b|\bprize/i,
    topic: "hackathon",
    text:
      "The Telegraph Hackathon runs three tracks: Track 1 for miners, Track 2 for scoring-module " +
      "authors and Track 3 for applications built on the protocol. Track 1 is judged on " +
      "normalized performance within each intent plus engagement, and an intent must have enough " +
      "active miners and real application traffic to be eligible for prizes.",
  },
  {
    match: /\balexandria\b/i,
    topic: "alexandria",
    text:
      "Alexandria is Telegraph's flagship intelligence layer, the product surface built on top of " +
      "the miner network and its routed answers.",
  },
  {
    match: /\b(what can you do|who are you|how can i use you|what are you)\b/i,
    topic: "assistant",
    text:
      "Telegraph is a decentralised network that routes a question to whichever registered miner " +
      "serves its intent, scores the answers each epoch, and ranks miners per intent. It can be " +
      "used by registering a miner that wraps an API, by authoring a WASM scoring module, or by " +
      "building an application that consumes routed answers.",
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

  const fact = FACTS.find((f) => f.match.test(q));
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
