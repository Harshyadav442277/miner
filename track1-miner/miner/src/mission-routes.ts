/**
 * Routes for the Season II mission intents (SEASON2_PLAN, "Add, in this order").
 *
 * Each one is a table entry rather than another block in handler.ts: the
 * handler reads the declared subject parameters and the question, caches a
 * successful answer, and sends it through the same envelope, watchdog and
 * in-flight sharing as every other route.
 */
import { lookupDns } from "./dns";
import { monitorFilings } from "./filings";
import { registryIntentFields, sanctionsIntentFields } from "./intent-fields";
import { chat, generateText, reviewCode } from "./genai";
import { verifyOnchainMetric } from "./onchain-metric";
import { answerQuestion } from "./qa";
import { macroIndicators } from "./macro";
import { lookupRegistry } from "./registry";
import { screenSanctions } from "./sanctions";
import { verifyTokenSupply } from "./token-supply";
import { urlReputation } from "./urlsafe";

export interface MissionAnswer { verdict: string; confidence: number; reason: string; error?: string }

export interface MissionRoute {
  /** "A sanctions screening": the watchdog's sentence when the route runs out of time. */
  what: string;
  /** Declared parameters that name the subject; they key the cache with the question. */
  params: readonly string[];
  /** `param(...names)` is the first of those parameters that carries a value, or "". */
  run: (question: string, param: (...names: string[]) => string) => Promise<MissionAnswer>;
}

export const MISSION_ROUTES: Record<string, MissionRoute> = {
  "/sanctions-screen": {
    what: "A sanctions screening",
    params: ["name", "wallet"],
    run: (q, p) => screenSanctions(q, p("name", "wallet")).then(sanctionsIntentFields),
  },
  "/company-registry": {
    what: "A company register lookup",
    params: ["company", "company_number", "lei"],
    run: (q, p) => lookupRegistry(q, p("company", "lei"), p("company_number")).then(registryIntentFields),
  },
  "/sec-filings": {
    what: "An SEC filing check",
    // `entity` and `period` are REGULATORY_FILING_MONITOR's own request names (GET /engine/v1/intents/<id>).
    params: ["company", "entity", "form", "period"],
    run: (q, p) => monitorFilings(q, p("company", "entity"), p("form"), new Date(), p("period")),
  },
  "/macro": {
    what: "A macroeconomic statistic lookup",
    params: ["indicator", "country"],
    run: (q, p) => macroIndicators(q, p("indicator"), p("country")),
  },
  "/url-reputation": {
    what: "A threat-list check",
    params: ["url"],
    run: (q, p) => urlReputation(q, p("url")),
  },
  "/answer": {
    what: "A cited answer",
    params: ["context"],
    run: (q, p) => answerQuestion(q, p("context")),
  },
  "/dns": {
    what: "A DNS lookup",
    params: ["domain", "name", "host", "type", "record_type"],
    run: (q, p) => lookupDns(q, p("domain", "name", "host"), p("type", "record_type")),
  },
  "/token-supply": {
    what: "A token supply read",
    params: ["token", "contract", "address", "chain"],
    run: (q, p) => verifyTokenSupply(q, p("token", "contract", "address"), p("chain")),
  },
  "/chat": {
    what: "A chat reply",
    params: ["message"],
    run: (q, p) => chat(q, p("message")),
  },
  "/code-review": {
    what: "A code review",
    params: ["code"],
    run: (q, p) => reviewCode(q, p("code")),
  },
  "/generate": {
    what: "The requested text",
    params: ["prompt"],
    run: (q, p) => generateText(q, p("prompt")),
  },
  "/onchain-metric": {
    what: "An on-chain metric read",
    params: ["chain", "block", "block_number", "address", "contract", "tx_hash"],
    run: (q, p) => verifyOnchainMetric(q, p("chain"), p("block", "block_number"), p("tx_hash", "contract", "address")),
  },
};
