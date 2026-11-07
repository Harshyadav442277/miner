#!/usr/bin/env node
/**
 * Every declared intent's response fields, checked against the node's own schema
 * (GET /engine/v1/intents/<id>: name, type, allowed values, range).
 *
 * The scorer reads these fields, so a scored field that is missing, null, the wrong type or outside its enum is
 * points lost before any answer is judged. Each endpoint is asked the first example question its manifest
 * description gives, on the base URL given.
 *
 *   node tools/schema-sweep.mjs https://miner-wine.vercel.app [out.json]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { MANIFEST_PATH } from "./manifest.mjs";

const base = (process.argv[2] ?? "https://miner-wine.vercel.app").replace(/\/$/, "");
const out = process.argv[3];
const NODE = "https://devnode.telegraphprotocol.com";
const yaml = readFileSync(MANIFEST_PATH, "utf8").replace(/\r\n/g, "\n");

// Each endpoint block: its path, its intents and the first "Example questions:" entry in its description.
const blocks = yaml.split(/\n  - path: /).slice(1).map((b) => {
  const path = b.match(/^(\S+)/)[1];
  const intents = (b.match(/\n    intents: \[([^\]]+)\]/)?.[1] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const desc = (b.match(/\n    description: >-\n([\s\S]*?)\n    params:/)?.[1] ?? "").replace(/\s+/g, " ");
  const example = desc.match(/Example questions?: "([^"]+)"/)?.[1] ?? desc.match(/"([^"]{12,160}\?)"/)?.[1] ?? null;
  return { path, intents, example };
});

function check(field, value) {
  if (value === undefined) return "missing";
  if (value === null) return "null";
  switch (field.type) {
    case "bool": {
      if (typeof value === "boolean") return null;
      const v = String(value).toLowerCase();
      return [...(field.true_when ?? []), ...(field.false_when ?? [])].map((x) => x.toLowerCase()).includes(v) ? null : `not a bool: ${JSON.stringify(value).slice(0, 40)}`;
    }
    case "number": {
      if (typeof value !== "number" || !Number.isFinite(value)) return `not a number: ${JSON.stringify(value).slice(0, 40)}`;
      if (field.range && (value < field.range[0] || value > field.range[1])) return `${value} outside ${field.range.join("–")}`;
      return null;
    }
    case "enum":
      return (field.allowed ?? []).includes(value) ? null : `"${String(value).slice(0, 40)}" not in [${(field.allowed ?? []).join(", ")}]`;
    case "list":
      return Array.isArray(value) ? null : `not a list: ${typeof value}`;
    case "string":
      return typeof value === "string" ? (value.trim() ? null : "empty") : `not a string: ${typeof value}`;
    default:
      return null;
  }
}

const rows = [];
for (const b of blocks) {
  for (const intent of b.intents) {
    const spec = await fetch(`${NODE}/engine/v1/intents/${intent}`, { signal: AbortSignal.timeout(20_000) }).then((r) => r.json()).catch(() => null);
    const fields = (spec?.intent ?? spec)?.response?.fields ?? [];
    if (!b.example) { rows.push({ intent, path: b.path, note: "no example question in the manifest" }); continue; }
    const url = `${base}${b.path}?query=${encodeURIComponent(b.example)}`;
    const body = await fetch(url, { signal: AbortSignal.timeout(30_000) }).then((r) => r.json()).catch((e) => ({ __error: String(e) }));
    const problems = fields.map((f) => ({ field: f.name, scored: Boolean(f.scored || f.processed), problem: check(f, body[f.name]) })).filter((p) => p.problem);
    rows.push({ intent, path: b.path, example: b.example, verdict: body.verdict ?? body.__error ?? null, fields: fields.length, problems });
  }
}
for (const r of rows) {
  const bad = (r.problems ?? []).map((p) => `${p.scored ? "*" : ""}${p.field}: ${p.problem}`).join("; ");
  console.log(`${(r.problems ?? []).some((p) => p.scored) ? "SCORED " : bad ? "minor  " : r.note ? "skip   " : "ok     "} ${r.intent.padEnd(36)} ${r.path.padEnd(20)} ${r.note ?? bad}`);
}
if (out) writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), base, rows }, null, 1));
