/**
 * Routes for the Season II mission intents (SEASON2_PLAN, "Add, in this order").
 *
 * Each one is a table entry rather than another block in handler.ts: the
 * handler reads the declared subject parameters and the question, caches a
 * successful answer, and sends it through the same envelope, watchdog and
 * in-flight sharing as every other route.
 */
import { monitorFilings } from "./filings";
import { macroIndicators } from "./macro";
import { lookupRegistry } from "./registry";
import { screenSanctions } from "./sanctions";
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
    run: (q, p) => screenSanctions(q, p("name", "wallet")),
  },
  "/company-registry": {
    what: "A company register lookup",
    params: ["company", "company_number", "lei"],
    run: (q, p) => lookupRegistry(q, p("company", "lei"), p("company_number")),
  },
  "/sec-filings": {
    what: "An SEC filing check",
    params: ["company", "form"],
    run: (q, p) => monitorFilings(q, p("company"), p("form")),
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
};
