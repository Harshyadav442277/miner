/**
 * Semantic diff of the REGISTERED manifest against the pending one.
 *
 * Byte diffing is useless here — the description was rewritten and every new
 * endpoint shifts line numbers. What matters is: does every endpoint that is
 * live today survive unchanged, in path, method, intents and parameters?
 *
 *   node manifest-diff.mjs <registered.yaml> <pending.yaml> [--allow-removed=/tvl,TVL_LOOKUP,…]
 *
 * A removal fails unless it is named in --allow-removed, so a deliberate
 * deregistration is stated in the command and an accidental one still fails.
 */
import { readFileSync } from "node:fs";

function parse(path) {
  const yaml = readFileSync(path, "utf8");
  const out = { file: path, endpoints: [], supported: [], scalars: {} };

  for (const k of ["version", "kind", "id", "slug", "protocol", "base_url", "rate_limit_per_sec", "min_price_usdc", "fee_address"]) {
    const m = yaml.match(new RegExp(`^${k}:\\s*(.+)$`, "m"));
    if (m) out.scalars[k] = m[1].trim();
  }
  const auth = yaml.match(/^auth:\s*\n\s+type:\s*(\S+)/m) ?? yaml.match(/^auth:\s*\{\s*type:\s*(\w+)/m);
  if (auth) out.scalars.auth_type = auth[1];

  let current = null;
  for (const line of yaml.split(/\r?\n/)) {
    const p = line.match(/^ {2}- path: (\/\S*)$/);
    if (p) { current = { path: p[1], method: null, intents: [], params: [] }; out.endpoints.push(current); continue; }
    if (!current) continue;
    const meth = line.match(/^ {4}method: (\S+)$/);
    if (meth) { current.method = meth[1]; continue; }
    const ints = line.match(/^ {4}intents: \[([^\]]+)\]$/);
    if (ints) { current.intents = ints[1].split(",").map((s) => s.trim()); continue; }
    const nm = line.match(/^ {10}- name: (\S+)$/);
    if (nm) current.params.push(nm[1]);
  }
  out.supported = [...yaml.matchAll(/^ {4}- ([A-Z][A-Z0-9_]+)$/gm)].map((m) => m[1]);
  return out;
}

const before = parse(process.argv[2]);
const after = parse(process.argv[3]);
const allowed = new Set((process.argv.find((a) => a.startsWith("--allow-removed=")) ?? "").slice("--allow-removed=".length).split(",").filter(Boolean));

let problems = 0;
const fail = (m) => { problems += 1; console.log(`  FAIL  ${m}`); };
const ok = (m) => console.log(`  ok    ${m}`);

console.log("\n=== Identity scalars must not change ===");
for (const k of Object.keys(before.scalars)) {
  if (before.scalars[k] === after.scalars[k]) ok(`${k} = ${before.scalars[k]}`);
  else fail(`${k}: "${before.scalars[k]}" -> "${after.scalars[k]}"`);
}

console.log("\n=== Every registered endpoint survives, byte-identical in shape ===");
const afterByPath = new Map(after.endpoints.map((e) => [e.path, e]));
for (const e of before.endpoints) {
  const a = afterByPath.get(e.path);
  if (!a) {
    if (allowed.has(e.path)) ok(`${e.path.padEnd(18)} removed on purpose (--allow-removed)`);
    else fail(`${e.path} HAS BEEN REMOVED`);
    continue;
  }
  const same =
    a.method === e.method &&
    JSON.stringify(a.intents) === JSON.stringify(e.intents) &&
    JSON.stringify(a.params) === JSON.stringify(e.params);
  if (same) ok(`${e.path.padEnd(18)} ${e.method} ${e.intents.join(",")} (${e.params.length} params) unchanged`);
  else {
    fail(`${e.path} CHANGED`);
    if (a.method !== e.method) console.log(`          method ${e.method} -> ${a.method}`);
    if (JSON.stringify(a.intents) !== JSON.stringify(e.intents)) console.log(`          intents ${e.intents} -> ${a.intents}`);
    if (JSON.stringify(a.params) !== JSON.stringify(e.params)) {
      const gone = e.params.filter((p) => !a.params.includes(p));
      const added = a.params.filter((p) => !e.params.includes(p));
      if (gone.length) console.log(`          params REMOVED: ${gone.join(", ")}`);
      if (added.length) console.log(`          params added:   ${added.join(", ")}`);
    }
  }
}

console.log("\n=== New endpoints ===");
const beforePaths = new Set(before.endpoints.map((e) => e.path));
for (const a of after.endpoints) {
  if (!beforePaths.has(a.path)) ok(`${a.path.padEnd(18)} ${a.method} ${a.intents.join(",")} (${a.params.length} params) NEW`);
}

console.log("\n=== supported_intents ===");
const goneIntents = before.supported.filter((i) => !after.supported.includes(i));
const newIntents = after.supported.filter((i) => !before.supported.includes(i));
const unplanned = goneIntents.filter((i) => !allowed.has(i));
if (unplanned.length) fail(`REMOVED from supported_intents: ${unplanned.join(", ")}`);
else if (goneIntents.length) ok(`removed on purpose (--allow-removed): ${goneIntents.join(", ")}`);
else ok(`all ${before.supported.length} registered intents preserved`);
ok(`added: ${newIntents.join(", ")}`);
console.log(`  registered ${before.supported.length} -> pending ${after.supported.length}`);

const removedOnPurpose = before.endpoints.filter((e) => !afterByPath.has(e.path)).length + goneIntents.length;
const pass = removedOnPurpose
  ? `PASS — nothing registered today is lost or altered except the ${removedOnPurpose} removals named in --allow-removed.`
  : "PASS — nothing registered today is lost or altered.";
console.log(`\n${problems === 0 ? pass : `${problems} PROBLEM(S) — do not sign.`}`);
process.exit(problems === 0 ? 0 : 1);
