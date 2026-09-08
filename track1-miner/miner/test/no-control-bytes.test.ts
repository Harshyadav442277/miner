import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * No source or tool file may contain a raw control byte.
 *
 * This has cost real measurement twice. In a JavaScript *string* `"\b"` is a
 * backspace character, `"\d"` is `d` and `"\s"` is `s` — so a regex assembled
 * from a string, or written through a shell heredoc that collapses one level of
 * escaping, silently stores 0x08 where a word boundary was meant.
 *
 *   GAPS G74      a storm.ts regex could only match "u-component", and a deploy
 *                 probe reported 31/31 while testing nothing.
 *   2026-09-08    `/\bon base\b/i` in intent-answers.mjs became `/<0x08>on
 *                 base<0x08>/i`, failing a correct production answer; and the
 *                 ONCHAIN probe's `/\d[\d,]* gas\b/` had been `/d[d,]* gas<0x08>/`
 *                 since it was written, so the "a missing transaction was given
 *                 a gas figure" check had never once been able to fire.
 *
 * Both times the symptom was a check reporting confidently about nothing, which
 * is worse than no check. Nothing in this codebase legitimately needs a literal
 * control byte in its source, so the rule is simply that there are none.
 */
// CommonJS build (see tsconfig), so `__dirname` rather than `import.meta`.
const ROOT = join(__dirname, "..", "..");
const SCAN = [join(ROOT, "src"), join(ROOT, "test"), join(ROOT, "..", "tools"), join(ROOT, "..", "bench")];
const CODE = /\.(ts|mjs|js)$/;

/** Tab (0x09), newline (0x0a) and carriage return (0x0d) are ordinary whitespace. */
const FORBIDDEN = /[\x00-\x08\x0b\x0c\x0e-\x1f]/;

function walk(dir: string): string[] {
  let out: string[] = [];
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    if (e === "node_modules" || e === "dist" || e === "dist-test" || e.startsWith(".")) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else if (CODE.test(e)) out.push(p);
  }
  return out;
}

test("no source or tool file contains a raw control byte", () => {
  const offenders: string[] = [];
  let scanned = 0;
  for (const dir of SCAN) {
    for (const file of walk(dir)) {
      scanned += 1;
      const text = readFileSync(file, "utf8");
      const lines = text.split(/\r?\n/);
      lines.forEach((line, i) => {
        if (!FORBIDDEN.test(line)) return;
        const code = line.match(FORBIDDEN)![0].charCodeAt(0).toString(16).padStart(2, "0");
        offenders.push(`${file}:${i + 1} contains 0x${code} — a regex escape was probably eaten`);
      });
    }
  }
  // A path that resolves to nothing would make this test pass while checking
  // nothing at all — which is precisely the defect it exists to catch.
  assert.ok(scanned > 40, `only ${scanned} files scanned; the scan paths are wrong`);
  assert.deepEqual(offenders, [], `\n${offenders.join("\n")}\n`);
});
