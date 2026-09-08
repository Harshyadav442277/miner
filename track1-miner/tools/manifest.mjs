/**
 * The manifest is the single source of truth for what this miner claims to do.
 *
 * Every measurement tool used to carry its own copy of that list, and every copy
 * drifted: `preflight.mjs` asserted the literal string "12/12 intents answering
 * correctly" while the manifest declared thirteen, so WEATHER_CHECK had no
 * correctness probe at all and the gate still reported a clean pass;
 * `opportunity-scan.mjs` scanned against a ten-intent ownership list that
 * predated FACT_CHECK, TELEGRAPH_KNOWLEDGE and WEATHER_CHECK. A tool that
 * measures a stale list reports confidently on the wrong thing, which is worse
 * than not measuring.
 *
 * So the list is read from `miner.yaml` here, once, and everything else imports
 * it. Adding an intent to the manifest immediately makes every tool demand
 * coverage for it.
 *
 * Parsing: the same line-anchored regexes `miner/test/manifest.test.ts` already
 * uses, deliberately rather than a YAML dependency the miner does not ship.
 * That is safe only because the file is ours and its shape is pinned by that
 * test — so this reader is strict: anything that does not look like the
 * manifest we know throws rather than returning a plausible-looking empty list.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TOOLS = dirname(fileURLToPath(import.meta.url));
export const MANIFEST_PATH = join(TOOLS, "..", "miner.yaml");

/** `{ baseUrl, endpoints: [{ path, intents }], intents: Set, supported: Set }` */
export function readManifest(path = MANIFEST_PATH) {
  const yaml = readFileSync(path, "utf8");

  const baseUrl = yaml.match(/^base_url:\s*(\S+)$/m)?.[1];
  if (!baseUrl) throw new Error(`${path}: no base_url found`);

  // An endpoint's intents live on the line(s) after its path, so the file is
  // walked in order rather than matched globally: a global match cannot say
  // which intent belongs to which route.
  const endpoints = [];
  for (const line of yaml.split(/\r?\n/)) {
    const p = line.match(/^ {2}- path: (\/\S*)$/);
    if (p) { endpoints.push({ path: p[1], intents: [] }); continue; }
    const i = line.match(/^ {4}intents: \[([^\]]+)\]$/);
    if (i && endpoints.length) {
      endpoints.at(-1).intents.push(...i[1].split(",").map((s) => s.trim()).filter(Boolean));
    }
  }
  if (endpoints.length === 0) throw new Error(`${path}: no endpoints found`);

  // `supported_intents:` is the list the chain actually registers. It is
  // checked against the per-endpoint intents by miner/test/manifest.test.ts;
  // both are returned here so a tool can assert on whichever it means.
  const supported = new Set([...yaml.matchAll(/^ {4}- ([A-Z][A-Z0-9_]+)$/gm)].map((m) => m[1]));
  if (supported.size === 0) throw new Error(`${path}: no supported_intents found`);

  const intents = new Set(endpoints.flatMap((e) => e.intents));
  if (intents.size === 0) throw new Error(`${path}: endpoints declare no intents`);

  return { baseUrl, endpoints, intents, supported, paths: endpoints.map((e) => e.path) };
}

/**
 * Fail a tool when its own coverage does not match what the manifest declares.
 *
 * `covered` is whatever the tool actually exercises. A declared intent with no
 * case is the defect this whole module exists to catch, so it is fatal; a case
 * for an intent we do not declare is also fatal, because it means the tool is
 * measuring something the network will never route to us.
 */
export function assertCoversDeclaredIntents(covered, { label = "coverage", manifest = readManifest() } = {}) {
  const have = new Set(covered);
  const missing = [...manifest.intents].filter((i) => !have.has(i)).sort();
  const extra = [...have].filter((i) => !manifest.intents.has(i)).sort();
  if (missing.length || extra.length) {
    const parts = [];
    if (missing.length) parts.push(`declared in miner.yaml but not covered by ${label}: ${missing.join(", ")}`);
    if (extra.length) parts.push(`covered by ${label} but not declared in miner.yaml: ${extra.join(", ")}`);
    throw new Error(parts.join("; "));
  }
  return manifest.intents.size;
}
