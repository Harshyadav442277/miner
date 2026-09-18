import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Inflight } from "../src/inflight";
import { handleRequest } from "../src/handler";

test("inflight isolates keys, releases completed work and bounds tracking", () => {
  const work = new Inflight<object>(1, 1);
  const a = {}, b = {}, c = {};
  assert.equal(work.join("one", a), false);
  assert.equal(work.join("one", b), true);
  assert.equal(work.join("one", c), false);
  assert.equal(work.join("two", {}), false);
  assert.deepEqual(work.finish(a), [b]);
  assert.deepEqual(work.finish(a), []);
  assert.equal(work.join("one", c), false);
  assert.deepEqual(work.finish(c), []);
});

test("a follower timeout detaches without releasing or poisoning its leader", () => {
  const work = new Inflight<object>();
  const a = {}, b = {}, c = {};
  work.join("one", a);
  work.join("one", b);
  assert.deepEqual(work.finish(b), []);
  assert.equal(work.join("one", c), true);
  assert.deepEqual(work.finish(a), [c]);
  assert.equal(work.join("one", {}), false);
});

function request(url: string): Promise<Record<string, unknown>> {
  return new Promise(resolve => {
    handleRequest({ method: "GET", url } as IncomingMessage, {
      writeHead() {},
      end(payload: unknown) { resolve(JSON.parse(String(payload))); },
    } as unknown as ServerResponse);
  });
}

test("20 concurrent translations use one upstream call and preserve every answer", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  let release!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  globalThis.fetch = (async () => {
    calls++;
    await blocked;
    return new Response(JSON.stringify(["Bonjour"]), { status: 200 });
  }) as typeof fetch;
  try {
    const query = encodeURIComponent('Translate "inflight test hello" into French.');
    const responses = Array.from({ length: 20 }, (_, i) => request(i % 2
      ? `/translate?query=${query}&unused=one`
      : `/translate?unused=one&query=${query}`));
    release();
    const bodies = await Promise.all(responses);
    assert.equal(calls, 1);
    assert.equal(bodies[0]?.reason, "Bonjour");
    for (const body of bodies) assert.deepEqual(body, bodies[0]);
  } finally {
    release();
    globalThis.fetch = original;
  }
});
