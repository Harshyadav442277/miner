import { ask, certQuery } from "./telegraph.js";
import { load, save, record, type Check, type State } from "./store.js";

/**
 * Pulls the fields we care about out of whatever shape the serving miner returned.
 * Miners for one intent do not share a response schema — the docs are explicit that
 * `result` varies per miner — so this reads defensively and reports what it found.
 */
function extract(result: unknown): Pick<Check, "verdict" | "daysRemaining" | "issuer" | "validTo"> {
  const r = (result ?? {}) as Record<string, unknown>;
  const pick = <T>(...keys: string[]): T | null => {
    for (const k of keys) {
      const v = r[k];
      if (v !== undefined && v !== null && v !== "") return v as T;
    }
    return null;
  };
  const valid = pick<boolean>("valid", "is_valid", "isValid");
  return {
    verdict:
      pick<string>("verdict", "status", "state") ??
      (typeof valid === "boolean" ? (valid ? "valid" : "invalid") : null),
    daysRemaining: pick<number>("days_remaining", "daysRemaining", "days_until_expiry"),
    issuer: pick<string>("issuer", "issuer_name", "ca"),
    validTo: pick<string>("valid_to", "validTo", "expires", "expiry", "not_after"),
  };
}

export async function checkDomain(domain: string): Promise<Check> {
  const at = new Date().toISOString();
  try {
    const r = await ask(certQuery(domain));
    return {
      domain,
      at,
      ...extract(r.result),
      minerName: r.minerName,
      minerId: r.minerId,
      intent: r.intent,
      signalHash: r.signalHash,
      costUsd: r.costUsd,
      durationMs: r.durationMs,
      error: null,
    };
  } catch (e) {
    return {
      domain,
      at,
      verdict: null,
      daysRemaining: null,
      issuer: null,
      validTo: null,
      minerName: null,
      minerId: null,
      intent: null,
      signalHash: null,
      costUsd: null,
      durationMs: null,
      error: (e as Error).message,
    };
  }
}

/** One pass over the whole watchlist, sequential so we never stack payments. */
export async function runOnce(state?: State): Promise<State> {
  const s = state ?? (await load());
  for (const domain of s.domains) {
    const check = await checkDomain(domain);
    record(s, check);
    const status = check.error ? `ERROR ${check.error}` : `${check.verdict} via ${check.minerName ?? "?"} [${check.intent ?? "?"}]`;
    console.log(`  ${domain.padEnd(28)} ${status}`);
  }
  await save(s);
  return s;
}
