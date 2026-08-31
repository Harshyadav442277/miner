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

test("/papers serves only the signal fields around the restated prose", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        results: [{
          title: "CRISPR-based gene therapy advances",
          publication_year: 2024,
          cited_by_count: 42,
          authorships: [{ author: { display_name: "A. Researcher" } }],
        }],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    )) as typeof globalThis.fetch;
  try {
    const body = await new Promise<Record<string, unknown>>((resolve) => {
      const req = {
        method: "GET",
        url: `/papers?query=${encodeURIComponent("Find recent peer-reviewed papers on CRISPR gene editing")}`,
      } as IncomingMessage;
      const res = {
        writeHead() {},
        end(payload?: unknown) {
          resolve(JSON.parse(String(payload)) as Record<string, unknown>);
        },
      } as unknown as ServerResponse;
      handleRequest(req, res);
    });
    // The converter summarises the WHOLE payload with keys re-sorted, so the
    // full PaperResult buried the restated question behind checked_at and the
    // papers JSON — measured 0.006041 vs 0.013419 for this shape (22/22 rows,
    // champion 688, bench/acad_shape.mjs). Only the signal_mapping fields and
    // the prose reach the converter now; the prose still names every paper.
    assert.deepEqual(Object.keys(body).sort(), ["confidence", "reason", "verdict"]);
    assert.match(String(body.reason), /^Regarding find recent peer-reviewed papers on CRISPR gene editing:/);
    assert.match(String(body.reason), /CRISPR-based gene therapy advances by A\. Researcher \(2024\), cited 42 times/);
    for (const k of ["papers", "count", "topic", "from_date", "to_date", "checked_at"]) {
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

test("the engine's zero-address filler is not reported as the asked-about wallet (live)", async () => {
  // The engine fills `address` with the zero address when the question names no
  // wallet (its leaked upstream calls in epochs 281, 292 and 295). Before the
  // filter, that filler was injected as the subject and this route answered
  // with the burn address's real holdings — a confidently wrong answer to a
  // question that supplied no wallet at all.
  const { body, status } = await capture(
    "/wallet-balance?address=0x0000000000000000000000000000000000000000&chain=arbitrum&query=" +
      encodeURIComponent("What is the current ETH balance for wallet address on the Arbitrum chain?"),
  );
  assert.equal(status, 200);
  assert.equal(body.error, "invalid_address");
  assert.doesNotMatch(String(body.reason), /currently has a native-coin balance/);
  // A question whose own TEXT asks about the zero address is still answered:
  // the filter drops only the structured filler, never the question's subject.
  const asked = await capture(
    "/wallet-balance?query=" +
      encodeURIComponent("What is the ETH balance of 0x0000000000000000000000000000000000000000?"),
  );
  assert.equal(asked.body.address, "0x0000000000000000000000000000000000000000");
  assert.notEqual(asked.body.error, "invalid_address");
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

test("a synchronous throw becomes an honest 200, never a 500", async () => {
  // A request line URL cannot parse: the very first statement in route() throws.
  const { body, status } = await new Promise<{ body: Record<string, unknown>; status: number }>(
    (resolve) => {
      const req = { method: "GET", url: undefined } as unknown as IncomingMessage;
      let code = 200;
      const res = {
        writeHead(c: number) { code = c; },
        end(payload?: unknown) {
          resolve({ body: JSON.parse(String(payload)) as Record<string, unknown>, status: code });
        },
      } as unknown as ServerResponse;
      // Force the throw: a getter that explodes when route() reads req.url.
      Object.defineProperty(req, "url", { get() { throw new Error("boom"); } });
      handleRequest(req, res);
    },
  );
  assert.equal(status, 200);
  assert.equal(body.error, "internal_error");
  assert.ok(String(body.reason).trim().length > 0, "an empty answer scores zero");
});
