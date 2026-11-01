import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ENDPOINTS } from "../src/handler";
import { ENDPOINT_SOURCES, NOT_UPSTREAM, SOURCES, weakest } from "../src/sources";

// CommonJS build (see tsconfig), so `__dirname` rather than `import.meta`.
const SRC = join(__dirname, "..", "..", "src");
// sources.ts itself is excluded: its URLs are the terms pages, not upstreams.
const files = readdirSync(SRC).filter((f) => f.endsWith(".ts") && f !== "sources.ts");
const text = new Map(files.map((f) => [f.slice(0, -3), readFileSync(join(SRC, f), "utf8")]));

/**
 * Hosts a module names: any written as a full URL, plus any registered host
 * written as a bare quoted string (holders.ts builds `https://${host}` from a
 * chain table). A host assembled from smaller pieces is still invisible here.
 */
function hostsIn(mod: string): Set<string> {
  const src = text.get(mod) ?? "";
  const out = new Set<string>();
  for (const m of src.matchAll(/["'`]https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)) out.add(m[1]!.toLowerCase());
  for (const h of SOURCES.flatMap((s) => s.hosts)) if (src.includes(`"${h}"`)) out.add(h);
  return out;
}

/** Every local module reachable from `entry` through `import ... from "./x"`. */
function reachable(entry: string): Set<string> {
  const seen = new Set<string>();
  const stack = [entry];
  while (stack.length) {
    const mod = stack.pop()!;
    if (seen.has(mod) || !text.has(mod)) continue;
    seen.add(mod);
    for (const m of text.get(mod)!.matchAll(/from "\.\/([a-z0-9-]+)"/g)) stack.push(m[1]!);
  }
  return seen;
}

/** Each declared endpoint's entry module(s), from the dispatch in handler.ts and mission-routes.ts. */
const ENTRY: Record<string, string[]> = {
  "/ssl-check": ["ssl"], "/storm-alert": ["storm"], "/weather-forecast": ["storm", "alertcheck", "forecast", "currentweather"],
  "/ip-geolocate": ["geo"], "/translate": ["translate"], "/papers": ["papers"], "/extract": ["content"], "/headlines": ["news"],
  "/wallet-balance": ["wallet"], "/fact-check": ["factcheck"], "/tx-lookup": ["onchain", "contractactivity"],
  "/transfer-verify": ["onchain", "contractactivity"], "/cve": ["cve", "cvesurvey", "cvekeyword"], "/news-search": ["newssearch"],
  "/convert": ["currency"], "/gas-price": ["gas"], "/financial": ["financial"], "/fraud-check": ["fraud"], "/token-holders": ["holders"],
  "/research": ["research"], "/crypto-price": ["cryptoprice"], "/stock-price": ["stockprice"], "/cross-chain": ["crosschain"],
  "/event-outcome": ["eventoutcome"], "/url-scan": ["urlscan"], "/web-search": ["websearch"], "/sentiment": ["sentiment", "prose-phrase"],
  "/classify": ["classify"], "/research-synthesis": ["synthesis"], "/sanctions-screen": ["sanctions"], "/company-registry": ["registry"],
  "/sec-filings": ["filings"], "/macro": ["macro"], "/url-reputation": ["urlsafe"], "/answer": ["qa"],
  "/dns": ["dns"], "/token-supply": ["token-supply"], "/keywords": ["keywords"], "/vuln-triage": ["vulntriage"],
};

test("every declared endpoint has an entry module here", () => {
  const declared = [...ENDPOINTS].sort();
  assert.deepEqual(Object.keys(ENTRY).sort(), declared, "add the new endpoint's entry module(s) to ENTRY");
});

const byHost = new Map(SOURCES.flatMap((s) => s.hosts.map((h) => [h, s.id] as const)));

test("every URL host written in src/ is a registered source or a named non-upstream", () => {
  const missing = [...new Set([...text.keys()].flatMap((m) => [...hostsIn(m)]))]
    .filter((h) => !byHost.has(h) && !NOT_UPSTREAM.includes(h));
  assert.deepEqual(missing, [], `add these hosts to SOURCES in src/sources.ts: ${missing.join(", ")}`);
});

test("every registered host still appears in src/, so the ledger has no dead entries", () => {
  const all = new Set([...text.keys()].flatMap((m) => [...hostsIn(m)]));
  const dead = SOURCES.flatMap((s) => s.hosts).filter((h) => !all.has(h));
  assert.deepEqual(dead, [], `remove or fix these hosts in SOURCES: ${dead.join(", ")}`);
});

test("ENDPOINT_SOURCES matches what each endpoint's import graph can reach", () => {
  const want: Record<string, string[]> = {};
  for (const [path, entries] of Object.entries(ENTRY)) {
    const ids = new Set<string>();
    for (const e of entries) for (const mod of reachable(e)) for (const h of hostsIn(mod)) { const id = byHost.get(h); if (id) ids.add(id); }
    want[path] = [...ids].sort();
  }
  assert.deepEqual(ENDPOINT_SOURCES, want, `replace ENDPOINT_SOURCES with:\n${JSON.stringify(want)}`);
});

test("every source cites its terms, and only an unread one lacks a read date", () => {
  for (const s of SOURCES) {
    assert.match(s.terms, /^https:\/\//, s.id);
    assert.equal(s.read === null, s.status === "unread", `${s.id}: read date and status disagree`);
    assert.equal(s.status === "conditional", Boolean(s.condition), `${s.id}: a condition belongs to a conditional source`);
  }
  assert.equal(new Set(SOURCES.map((s) => s.id)).size, SOURCES.length, "source ids are unique");
});

test("an endpoint is only as licensed as its weakest upstream", () => {
  assert.equal(weakest(["frankfurter"]), "licensed");
  assert.equal(weakest(["frankfurter", "bitstamp"]), "conditional", "an unmet condition is still conditional");
  assert.equal(weakest(["frankfurter", "ecb"]), "licensed", "the ECB's condition is met");
  assert.equal(weakest(["metno"]), "licensed", "a met condition counts as licensed");
  assert.equal(weakest(["frankfurter", "yahoo"]), "licensed", "a barred source is never called, so it does not weaken the endpoint");
  assert.equal(weakest(["yahoo", "nasdaq"]), "barred", "an endpoint with only barred sources serves nothing");
  assert.equal(weakest(["no-such-source"]), "unread");
});
