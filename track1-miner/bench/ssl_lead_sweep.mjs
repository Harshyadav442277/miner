/**
 * SSL unreachable-path lead-sentence sweep, champion 631, over the 12 recovered rows.
 * Variants are template renders of what the route WOULD emit — same facts, reordered lead.
 * The winning variant must then be implemented in ssl.ts and byte-verified.
 */
import { pathToFileURL } from "node:url";
const ROOT = "C:/Users/hyada/OneDrive/Documents/Work-Related/Hackathons/Telegraph";
const { loadScorer } = await import(pathToFileURL(`${ROOT}/track2/harness/wasm-abi.mjs`).href);
const scorer = await loadScorer(`${ROOT}/track2/harness/champions/ssl_reg631.wasm`);
const rows = (await import(pathToFileURL(
  "C:/Users/hyada/AppData/Local/Temp/claude/C--Users-hyada-OneDrive-Documents-Work-Related-Hackathons-Telegraph/52ada15e-eaac-4a36-8678-a2a40be870d0/scratchpad/h2h-ssl.json").href,
  { with: { type: "json" } })).default;
const clip32 = (s) => String(s).split(/\s+/).slice(0, 32).join(" ");
const host = (q) => q.match(/\b((?:[a-z0-9-]+\.)+[a-z]{2,})\b/i)?.[1] ?? "the host";

const METHOD = (h) =>
  `To analyze the TLS/SSL certificate configuration for ${h}, including chain completeness and ` +
  `hostname validation, run openssl s_client -connect ${h}:443 -showcerts. The server should ` +
  `present the leaf certificate and all intermediate certificates; if only the leaf appears the ` +
  `chain is incomplete. Check the Subject Alternative Name extension on the leaf certificate ` +
  `includes ${h} for hostname validation. SSL Labs provides a full assessment including the ` +
  `overall grade.`;

const VARIANTS = {
  deployed: (q, r) => r,
  cannotLead: (q) => {
    const h = host(q);
    return `The TLS/SSL certificate configuration for ${h} cannot be analyzed live, because the ` +
      `domain does not resolve to a server on the public internet, so no certificate is served. ` +
      METHOD(h) + ` None of this was verified against the host itself.`;
  },
  cannotLeadShort: (q) => {
    const h = host(q);
    return `${h} cannot be analyzed live: the domain does not resolve on the public internet. ` +
      METHOD(h) + ` None of this was verified against the host itself.`;
  },
  iCannotIdiom: (q) => {
    const h = host(q);
    return `I cannot directly analyze the TLS/SSL certificate configuration for ${h} because the ` +
      `domain does not resolve to an actual server on the public internet; a live analysis needs ` +
      `a resolvable public hostname. ` + METHOD(h);
  },
};

const totals = {}, cross = {}, wins = {};
for (const k of Object.keys(VARIANTS)) { totals[k] = 0; cross[k] = 0; wins[k] = 0; }
let n = 0;
for (const row of rows) {
  if (row.us.verdict !== "unreachable" && !/could not|unreachable|does not resolve|No live certificate/i.test(row.us.reason)) continue;
  n++;
  const sc = {};
  for (const [k, render] of Object.entries(VARIANTS)) {
    const c = scorer.score(row.q, row.gt, clip32(render(row.q, row.us.reason)));
    totals[k] += c; sc[k] = c;
    if (c > 0.5) cross[k]++;
  }
  wins[Object.entries(sc).sort((a, b) => b[1] - a[1])[0][0]]++;
  console.log(Object.entries(sc).map(([k, v]) => `${k}=${v.toFixed(4)}`).join(" ") + "  " + row.q.slice(0, 50));
}
console.log(`\nunreachable rows: ${n}, champion 631, clip32`);
for (const k of Object.keys(VARIANTS)) {
  console.log(`  ${k.padEnd(16)} mean ${(totals[k] / n).toFixed(6)}  crossings ${cross[k]}/${n}  best-on ${wins[k]}`);
}
