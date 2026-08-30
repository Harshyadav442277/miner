import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { handleRequest } from "../src/handler";

function healthRequest(query: string): { req: IncomingMessage; res: ServerResponse } {
  const req = { method: "GET", url: `/health?query=${encodeURIComponent(query)}` } as IncomingMessage;
  const res = { writeHead() {}, end() {} } as unknown as ServerResponse;
  return { req, res };
}

test("request logging is off by default", () => {
  const prior = process.env.LOG_QUERY;
  const original = process.stdout.write;
  let logged = "";
  delete process.env.LOG_QUERY;
  process.stdout.write = ((chunk: string | Uint8Array) => {
    logged += String(chunk);
    return true;
  }) as typeof process.stdout.write;
  try {
    const { req, res } = healthRequest("private text");
    handleRequest(req, res);
    assert.equal(logged, "");
  } finally {
    process.stdout.write = original;
    if (prior === undefined) delete process.env.LOG_QUERY;
    else process.env.LOG_QUERY = prior;
  }
});

test("opt-in logging records parameter names, never values", () => {
  const prior = process.env.LOG_QUERY;
  const original = process.stdout.write;
  let logged = "";
  process.env.LOG_QUERY = "on";
  process.stdout.write = ((chunk: string | Uint8Array) => {
    logged += String(chunk);
    return true;
  }) as typeof process.stdout.write;
  try {
    const { req, res } = healthRequest("private text");
    handleRequest(req, res);
    assert.match(logged, /health.*query/);
    assert.doesNotMatch(logged, /private|text/);
  } finally {
    process.stdout.write = original;
    if (prior === undefined) delete process.env.LOG_QUERY;
    else process.env.LOG_QUERY = prior;
  }
});

test("/translate answers with the bare translation, unrestated", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(["Бонжур"]), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof globalThis.fetch;
  try {
    const body = await new Promise<Record<string, unknown>>((resolve) => {
      const req = {
        method: "GET",
        url: `/translate?query=${encodeURIComponent('Translate "good morning" into Russian.')}`,
      } as IncomingMessage;
      const res = {
        writeHead() {},
        end(payload?: unknown) {
          resolve(JSON.parse(String(payload)) as Record<string, unknown>);
        },
      } as unknown as ServerResponse;
      handleRequest(req, res);
    });
    // The recorded ground truths are bare translations, and Telegraph converts
    // the WHOLE payload into the prose it scores — so the payload carries the
    // answer and nothing English for the converter to wrap around it. Only the
    // three signal_mapping fields are required by the manifest.
    assert.equal(body.reason, "Бонжур");
    assert.equal(body.translation, "Бонжур");
    assert.deepEqual(
      Object.keys(body).sort(),
      ["confidence", "reason", "translation", "verdict"],
    );
    for (const k of ["source", "source_text", "target_language", "target_code", "checked_at"]) {
      assert.ok(!(k in body), `${k} must not reach the converter`);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

/**
 * The engine fills the parameters the manifest declares and may also send a
 * `query` that only refers back to them — "this wallet", "there", "this
 * subject". Six of the ten routes used to drop the declared subject in that
 * case: four refused outright and two answered about the wrong thing entirely
 * (`/papers` returned neuroimaging papers for a CRISPR topic; `/storm-alert`
 * asked about Chennai reported Teresópolis, Brazil).
 *
 * These pin both halves of the contract: the subject survives a paraphrasing
 * query, and a verbatim query is left exactly as it was — no scored surface on
 * the intents we lead may move.
 */
function capture(url: string): Promise<{ body: Record<string, unknown>; status: number }> {
  return new Promise((resolve) => {
    const req = { method: "GET", url } as IncomingMessage;
    let status = 200;
    const res = {
      writeHead(code: number) { status = code; },
      end(payload?: unknown) {
        resolve({ body: JSON.parse(String(payload)) as Record<string, unknown>, status });
      },
    } as unknown as ServerResponse;
    handleRequest(req, res);
  });
}

const WALLET = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

test("a paraphrasing query does not discard the declared address (live)", async () => {
  const { body, status } = await capture(
    `/wallet-balance?address=${WALLET}&query=${encodeURIComponent("What is the balance of this wallet?")}`,
  );
  assert.equal(status, 200);
  assert.notEqual(body.error, "invalid_address");
  assert.equal(body.address, WALLET);
});

test("a paraphrasing query does not discard the declared text to translate", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(["Bonjour"]), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof globalThis.fetch;
  try {
    const { body } = await capture(
      "/translate?text=Good%20morning&target_language=French&query=" +
        encodeURIComponent("Translate it."),
    );
    assert.equal(body.reason, "Bonjour");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a paraphrasing query does not discard the declared text to extract", async () => {
  const { body } = await capture(
    "/extract?text=" + encodeURIComponent("Reach us at support@example.com or call 555-0192.") +
      "&query=" + encodeURIComponent("Extract the contact details."),
  );
  assert.match(String(body.reason), /support@example\.com/);
});

test("a verbatim query is passed through unchanged, so scored answers do not move", async () => {
  // Both requests carry the subject inside the question already. The declared
  // parameter must add nothing — byte-identical output is what makes this
  // change safe to ship onto intents we currently lead.
  const q = "Is the SSL certificate for github.com valid?";
  const withParam = await capture(`/ssl-check?domain=github.com&query=${encodeURIComponent(q)}`);
  const withoutParam = await capture(`/ssl-check?query=${encodeURIComponent(q)}`);
  assert.equal(withParam.body.reason, withoutParam.body.reason);
});

/**
 * Vercel kills the function at maxDuration and returns a 504, and Telegraph
 * scores any non-2xx as zero with an empty answer. The routes can outlast that
 * ceiling when upstreams hang instead of failing, so the miner keeps its own
 * deadline inside the platform's.
 */
test("a hung upstream is answered honestly, not left to become a 504", async () => {
  const originalFetch = globalThis.fetch;
  const prior = process.env.WATCHDOG_MS;
  process.env.WATCHDOG_MS = "60";
  // A fetch that never settles is exactly the case the platform turns into a 504.
  globalThis.fetch = (() => new Promise(() => {})) as typeof globalThis.fetch;
  try {
    const { body, status } = await capture(
      "/wallet-balance?address=" + WALLET + "&query=" + encodeURIComponent("balance of this wallet"),
    );
    assert.equal(status, 200);
    assert.ok(String(body.reason).trim().length > 0, "an empty answer scores zero");
  } finally {
    globalThis.fetch = originalFetch;
    if (prior === undefined) delete process.env.WATCHDOG_MS;
    else process.env.WATCHDOG_MS = prior;
  }
});

test("the first answer wins and a late upstream cannot write twice", async () => {
  // Two writes to one response throw in production; the guard must be on send,
  // not on the watchdog alone.
  let writes = 0;
  await new Promise<void>((resolve) => {
    const req = { method: "GET", url: "/health" } as IncomingMessage;
    const res = {
      writeHead() {},
      end() { writes++; resolve(); },
    } as unknown as ServerResponse;
    handleRequest(req, res);
    handleRequest(req, res);
  });
  assert.equal(writes, 1);
});
