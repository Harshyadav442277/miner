/**
 * One CertWatch sweep, for the scheduled workflow.
 *
 * Runs the same paid checks the server exposes, then writes the accumulated
 * history to STATE_FILE so the workflow can commit it. Deliberately a separate
 * entrypoint from the server: the server renders, this spends.
 */
import { load, save, record, type State } from "./store.js";
import { checkDomain } from "./monitor.js";

const MAX_PER_SWEEP = Number(process.env.MAX_DOMAINS_PER_SWEEP ?? 10);

async function main(): Promise<void> {
  if (!process.env.EVM_PRIVATE_KEY) {
    console.error("EVM_PRIVATE_KEY is not set — refusing to sweep.");
    process.exitCode = 1;
    return;
  }

  const state: State = await load();
  const domains = state.domains.slice(0, MAX_PER_SWEEP);
  if (domains.length === 0) {
    console.log("No domains configured (set the WATCH_DOMAINS repository variable). Nothing to do.");
    return;
  }

  console.log(`sweeping ${domains.length} domain(s)`);
  for (const domain of domains) {
    try {
      const check = await checkDomain(domain);
      record(state, check);
      console.log(`  ${domain} -> ${check.verdict ?? check.error ?? "?"}`);
    } catch (e) {
      console.error(`  ${domain} -> failed: ${(e as Error).message}`);
    }
  }
  await save(state);
  console.log(`recorded ${state.checks.length} check(s), ${state.totals.requests} paid request(s) total`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
