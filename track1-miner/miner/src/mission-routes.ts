/**
 * Routes for the Season II mission intents (SEASON2_PLAN, "Add, in this order").
 *
 * Each one is a table entry rather than another block in handler.ts: the
 * handler reads the declared subject parameters and the question, caches a
 * successful answer, and sends it through the same envelope, watchdog and
 * in-flight sharing as every other route.
 */
import { screenSanctions } from "./sanctions";

export interface MissionAnswer { verdict: string; confidence: number; reason: string; error?: string }

export interface MissionRoute {
  /** "A sanctions screening": the watchdog's sentence when the route runs out of time. */
  what: string;
  /** Declared parameters that name the subject, most specific first. */
  params: readonly string[];
  run: (question: string, subject: string) => Promise<MissionAnswer>;
}

export const MISSION_ROUTES: Record<string, MissionRoute> = {
  "/sanctions-screen": {
    what: "A sanctions screening",
    params: ["name", "wallet"],
    run: (q, subject) => screenSanctions(q, subject),
  },
};
