import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ENDPOINTS } from "../src/handler";

// The node reads each response field at the path miner.yaml's intent_mapping names, and a mapping is validated at
// registration (anjoman.ai/docs/miners/yaml-config, Intent mapping). A path that is not in our answers is a field
// the node reports missing; a field name the intent does not have is a rejection. Both must fail here, not
// on-chain. The intents' response fields and the production answers they are checked against were recorded on
// 2026-11-08 UTC in docs/evidence/intent-mapping-2026-11-08/.

const EVIDENCE = "../docs/evidence/intent-mapping-2026-11-08";
type Field = { name: string; type: string; scored?: boolean; processed?: boolean };
type Entry = { endpoint: string; output: Map<string, string> };
type Answer = { intent: string; path: string; query: string; answer: Record<string, unknown> };

const yaml = readFileSync(resolve(process.cwd(), "../miner.yaml"), "utf8").replace(/\r\n/g, "\n");
const fields: Record<string, { fields: Field[] }> = JSON.parse(readFileSync(resolve(process.cwd(), EVIDENCE, "response-fields.json"), "utf8"));
const answers: Answer[] = JSON.parse(readFileSync(resolve(process.cwd(), EVIDENCE, "answers.json"), "utf8"));

/** The intent_mapping block, read strictly: any line that is not an intent, endpoint, output or field throws. */
function readMapping(): Map<string, Entry> {
  const lines = yaml.split("\n");
  const start = lines.indexOf("intent_mapping:");
  assert.ok(start >= 0, "miner.yaml has no top-level intent_mapping");
  const out = new Map<string, Entry>();
  let cur: Entry | undefined;
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break; // next top-level key or comment
    if (!line.trim()) continue;
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^ {2}([A-Z][A-Z0-9_]+):$/))) {
      assert.ok(!out.has(m[1]!), `${m[1]} is mapped twice`);
      cur = { endpoint: "", output: new Map() };
      out.set(m[1]!, cur);
    } else if ((m = line.match(/^ {4}endpoint: (\/\S+)$/)) && cur) cur.endpoint = m[1]!;
    else if (/^ {4}output:$/.test(line) && cur) continue;
    else if ((m = line.match(/^ {6}([a-z][a-z0-9_]*): \{ path: (?:"([^"]+)"|([^\s"{}]+)) \}$/)) && cur) {
      assert.ok(!cur.output.has(m[1]!), `${m[1]} is mapped twice`);
      cur.output.set(m[1]!, (m[2] ?? m[3])!);
    } else assert.fail(`unexpected line in intent_mapping: ${JSON.stringify(line)}`);
  }
  return out;
}

/** Each endpoint's declared intents, in file order. */
function endpointIntents(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  let path = "";
  for (const line of yaml.split("\n")) {
    const p = line.match(/^ {2}- path: (\/\S*)$/);
    if (p) { path = p[1]!; out.set(path, []); continue; }
    const i = line.match(/^ {4}intents: \[([^\]]+)\]$/);
    if (i && path) out.get(path)!.push(...i[1]!.split(",").map((s) => s.trim()));
  }
  return out;
}

const supported = [...yaml.matchAll(/^ {4}- ([A-Z][A-Z0-9_]+)$/gm)].map((m) => m[1]!);
const mapping = readMapping();

/** The value at a mapping path: a top-level key, or `x[].k` for key k of every element of list x. */
function at(answer: Record<string, unknown>, path: string): unknown {
  const each = path.match(/^([a-z0-9_]+)\[\]\.([a-z0-9_]+)$/);
  if (each) {
    const xs = answer[each[1]!];
    return Array.isArray(xs) ? xs.map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>)[each[2]!] : undefined)) : undefined;
  }
  assert.match(path, /^[a-z0-9_]+$/,`path ${path} is neither a top-level key nor x[].k`);
  return answer[path];
}

// Only scored or processed fields are mapped: the full mapping put miner.yaml at 103 KB, and Anjoman's validator
// answered "request entity too large" (owner, 2026-11-09). An intent whose schema scores nothing has no entry.
test("every supported intent with a scored field has a mapping, and nothing else is mapped", () => {
  assert.equal(supported.length, 43);
  for (const intent of supported) {
    const f = fields[intent]?.fields;
    assert.ok(f, `${intent} has no recorded response fields; re-record docs/evidence/intent-mapping-*`);
    const scored = f.some((x: { scored?: boolean; processed?: boolean }) => x.scored || x.processed);
    if (scored) assert.ok(mapping.has(intent), `${intent} has a scored field but no intent_mapping entry`);
    else assert.ok(!mapping.has(intent), `${intent} scores nothing, so it has nothing to map`);
  }
  for (const intent of mapping.keys()) assert.ok(supported.includes(intent), `${intent} is mapped but not in supported_intents`);
  assert.equal(mapping.size, 36);
});

test("miner.yaml stays under the size Anjoman's validator accepted", () => {
  // 93,175 bytes (96,002 as the JSON request) validated on 2026-11-07; 103,086 (106,235) was refused as too large.
  const bytes = Buffer.byteLength(readFileSync(resolve(process.cwd(), "../miner.yaml"), "utf8").replace(/\r\n/g, "\n"));
  assert.ok(bytes <= 97_000, `miner.yaml is ${bytes} bytes; keep it under 97,000`);
});

test("each mapping names a served endpoint that declares the intent", () => {
  const eps = endpointIntents();
  for (const [intent, e] of mapping) {
    assert.ok(ENDPOINTS.includes(e.endpoint), `${intent}: ${e.endpoint} is not served`);
    assert.ok(eps.get(e.endpoint)?.includes(intent), `${intent}: ${e.endpoint} does not declare it`);
  }
});

test("each mapped field is one of the intent's response fields, and every scored field is mapped", () => {
  for (const [intent, e] of mapping) {
    const f = fields[intent]!.fields;
    for (const name of e.output.keys()) assert.ok(f.some((x) => x.name === name), `${intent}.${name} is not a response field`);
    for (const x of f.filter((x) => x.scored || x.processed)) assert.ok(e.output.has(x.name), `${intent}.${x.name} is scored but not mapped`);
  }
});

test("each mapped path holds a value in a recorded production answer, of the scored field's type", () => {
  for (const [intent, e] of mapping) {
    const recorded = answers.filter((a) => a.intent === intent);
    assert.ok(recorded.length, `${intent}: no recorded answer`);
    for (const a of recorded) assert.equal(a.path, e.endpoint, `${intent}: recorded on ${a.path}, mapped to ${e.endpoint}`);
    for (const [name, path] of e.output) {
      const values = recorded.map((a) => at(a.answer, path)).filter((v) => v !== undefined);
      assert.ok(values.length, `${intent}.${name}: path ${path} is in none of the ${recorded.length} recorded answers`);
      const spec = fields[intent]!.fields.find((x) => x.name === name)!;
      if (!spec.scored) continue;
      const js = spec.type === "bool" ? "boolean" : spec.type === "number" || spec.type === "integer" ? "number" : "";
      for (const v of values) if (js && v !== null) assert.equal(typeof v, js, `${intent}.${name} at ${path} is ${JSON.stringify(v)}`);
      assert.ok(values.some((v) => v !== null), `${intent}.${name}: every recorded answer has it null`);
    }
  }
});
