import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { handleRequest } from "../src/handler";

/**
 * Nothing this service returns may ever be a non-2xx.
 *
 * Telegraph's engine records any non-2xx from a miner as an upstream error: it
 * stores an empty miner_answer, produces no converted answer, and the scorer
 * therefore sees nothing and scores **0 for the whole epoch**. That is a far
 * bigger loss than any wording difference — in epoch 293, 8 of 36 scored rows
 * across the field carried an infrastructure failure of exactly this kind
 * (`skywire-storm-alert`, `iplocate`, `netwire-ip-geolocation`,
 * `weathertop-v3`, `oathcast-weather`, `lacre-meteo`, `tempest-storm-
 * intelligence`, `certspotter-cert-verification`).
 *
 * These tests pin the two classes we closed on 2026-08-30 so they cannot come
 * back: a method other than GET, and a path whose case or trailing slash does
 * not match the manifest exactly.
 */

/**
 * The status written *synchronously*, or 0 when the route deferred to async work.
 *
 * The routes that answer an intent all make an upstream call and write their
 * status later, so 0 here means "accepted, answering asynchronously" — which is
 * the good case and needs no network to verify. A rejection is different: the
 * 405 and 404 branches write immediately, before any await. So asserting that
 * nothing is written synchronously except a 2xx pins exactly the regression,
 * without turning these into live tests.
 */
function syncStatusOf(method: string, url: string): number {
  let status = 0;
  const req = { method, url } as IncomingMessage;
  const res = {
    writeHead(code: number) {
      status = code;
    },
    end() {},
    setHeader() {},
  } as unknown as ServerResponse;
  handleRequest(req, res);
  return status;
}

/** Accepted means: answered 2xx now, or deferred to the async answer. Never 4xx/5xx. */
function assertAccepted(method: string, url: string): void {
  const s = syncStatusOf(method, url);
  assert.ok(
    s === 0 || (s >= 200 && s < 300),
    `${method} ${url} was refused synchronously with ${s} — that is a zero for the epoch`,
  );
}

describe("no request may produce a non-2xx", () => {
  test("a method other than GET is answered, not 405ed", () => {
    // Every route is a pure read with no side effects, so answering a POST the
    // same thing is safe — and a 405 would be a guaranteed zero.
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      assertAccepted(method, "/ssl-check?domain=github.com");
    }
  });

  test("HEAD and GET still work", () => {
    for (const method of ["GET", "HEAD"]) {
      assertAccepted(method, "/ssl-check?domain=github.com");
    }
  });

  test("a mis-cased path still routes", () => {
    for (const p of ["/SSL-Check", "/Ssl-check", "/AI-DETECT", "/Weather-Forecast"]) {
      assertAccepted("GET", `${p}?domain=github.com&q=test&text=x`);
    }
  });

  test("a trailing slash still routes", () => {
    for (const p of ["/ssl-check/", "/weather-forecast//", "/ai-detect/"]) {
      assertAccepted("GET", `${p}?domain=github.com&q=test&text=x`);
    }
  });

  test("OPTIONS is answered rather than refused", () => {
    assertAccepted("OPTIONS", "/ssl-check");
  });

  test("a genuinely unknown path is still a 404, and that is deliberate", () => {
    // The permissiveness above is about matching OUR routes despite cosmetic
    // differences. Answering arbitrary paths would mean returning a nonsense
    // answer to a question we do not serve, which is worse than scoring zero.
    assert.equal(syncStatusOf("GET", "/not-a-route"), 404);
  });
});
