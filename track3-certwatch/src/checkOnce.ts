import { load } from "./store.js";
import { runOnce } from "./monitor.js";
import { payerAddress } from "./telegraph.js";

/** One-shot check of every watched domain. Suitable for cron. */
const state = await load();
if (state.domains.length === 0) {
  console.error("No domains being watched. Add some via the dashboard or data/state.json.");
  process.exit(1);
}
console.log(`paying from ${payerAddress() ?? "(no key set)"}`);
console.log(`checking ${state.domains.length} domain(s) via Telegraph:`);
const after = await runOnce(state);
console.log(
  `\ntotal: ${after.totals.requests} paid requests, $${after.totals.spentUsd.toFixed(4)}, ` +
    `${after.totals.sslVerificationRequests} classified SSL_VERIFICATION`,
);
