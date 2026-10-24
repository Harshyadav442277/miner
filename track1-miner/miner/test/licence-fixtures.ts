import { SOURCES } from "../src/sources";

/**
 * Opens a barred source's gate for the rest of this test process, so the code
 * that reads it can still be tested. Production keeps the gate closed (GAPS
 * G208). Each test file runs in its own process, so this cannot leak into
 * test/licence-gates.test.ts, which asserts the closed default.
 */
export function openGate(id: string): void {
  const s = SOURCES.find((x) => x.id === id);
  if (!s) throw new Error(`no source ${id}`);
  s.status = "unclear";
}
