import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addressForSymbol, chainLabel, poolTokenAddress, concentrationPercent, contractAddress, lookupHolders,
  resolveChain, supportedChains, tokenSymbol, wantsConcentration,
} from "../src/holders";
import { KNOWN_TOKENS } from "../src/known-tokens";

test("the chain named in the question decides which index is read", () => {
  assert.equal(resolveChain("", "How many addresses hold usdc on base?"), "base");
  assert.equal(resolveChain("", "holders of this token on polygon"), "polygon");
  assert.equal(resolveChain("", "holder count on arbitrum"), "arbitrum");
  // An explicit parameter wins over prose.
  assert.equal(resolveChain("optimism", "on base"), "optimism");
  // Nothing named is null, which is what makes every chain get probed rather
  // than Ethereum being assumed — the G88 defect, avoided by construction.
  assert.equal(resolveChain("", "how many holders does this token have?"), null);
});

test("every supported chain has a label", () => {
  for (const c of supportedChains()) assert.ok(chainLabel(c).length > 0);
  assert.equal(chainLabel("base"), "Base");
});

test("a contract address is read from anywhere in the question", () => {
  assert.equal(
    contractAddress("holders of 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 on base"),
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  );
  assert.equal(contractAddress("no address here"), null);
});

test("a symbol is read when no contract address is given", () => {
  assert.equal(tokenSymbol("How many addresses hold usdc on base?"), "USDC");
  assert.equal(tokenSymbol("holder count for WETH"), "WETH");
  // The chain is not the token.
  assert.notEqual(tokenSymbol("How many addresses hold usdc on base?"), "BASE");
  assert.equal(tokenSymbol("how many holders are there?"), null);
});

/**
 * A real routed question named a CVE identifier as the token. Answering it with
 * whatever a token search returns for "CVE" would be a confident answer about
 * something that does not exist.
 */
test("an identifier that is not a token is named as such, never searched for", async () => {
  const r = await lookupHolders(
    "For token CVE-2021-44228, report total holder count and what percent the largest single holder owns (top-1 concentration).",
  );
  assert.equal(r.verdict, "not_a_token");
  assert.equal(r.error, "not_a_token");
  assert.equal(r.holders, null);
  assert.match(r.reason, /CVE-2021-44228/);
  assert.match(r.reason, /not a token/);
});

test("a URL given as the token is named as such, never searched for", async () => {
  // Also a real routed question, from the same feed.
  const r = await lookupHolders(
    "For token https://scam-defi-honeypot.example/claim-a1b2, report total holder count and what percent the largest single holder owns (top-1 concentration).",
  );
  assert.equal(r.verdict, "not_a_token");
  assert.equal(r.holders, null);
  assert.match(r.reason, /a web address/);
});

test("no token in the request is refused, and nothing is guessed", async () => {
  const r = await lookupHolders("how many holders are there?");
  assert.equal(r.verdict, "unknown");
  assert.equal(r.error, "no_token");
  assert.match(r.reason, /No token was guessed at/);
});

test("concentration is asked for in several phrasings, plurals included", () => {
  assert.ok(wantsConcentration("what percent the largest single holder owns (top-1 concentration)"));
  assert.ok(wantsConcentration("top1 concentration please"));
  assert.ok(wantsConcentration("what does the largest holder own?"));
  // G94 is the reason the plural is asserted rather than assumed: a marker
  // ending in \b cannot match its own plural.
  assert.ok(wantsConcentration("who are the largest holders?"));
  assert.ok(!wantsConcentration("How many addresses hold usdc on base?"));
});

/**
 * The symbol path resolves through GeckoTerminal because the explorer's own
 * search takes 3.9 to 5.5 seconds and did not return at all from Vercel's
 * egress, turning the intent's only clean routed question into an outage in
 * production while it passed on a laptop (G84).
 */
test("a symbol resolves to the canonical contract (live)", async () => {
  const addr = await addressForSymbol("base", "USDC");
  // Both resolvers shed under load, and a gate that fails on somebody else's
  // rate limit teaches you to ignore it (G80). Shedding is reported as such;
  // an answer must still be the right one.
  if (addr === "unavailable") return;
  assert.equal(String(addr).toLowerCase(), "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913");
});

test("the concentration percentage is the top balance over supply, and refuses nonsense", () => {
  assert.equal(concentrationPercent(237934679745985, "4275762984402800"), 5.56);
  assert.equal(concentrationPercent(1, "0"), null);
  assert.equal(concentrationPercent(1, null), null);
  // A top balance larger than supply means the two numbers are not comparable,
  // so no figure is reported rather than a wrong one.
  assert.equal(concentrationPercent(10, "5"), null);
});

// A node test case (epoch 331, read from a competitor's failure_reason): Arbitrum's
// own token was taken for the chain word and no token was found.
test("a chain's own token ticker is a symbol when the question is about holders", async () => {
  const { tokenSymbol } = await import("../src/holders");
  assert.equal(tokenSymbol("How many holders does the ARB token have on Arbitrum One?"), "ARB");
  assert.equal(tokenSymbol("How many addresses hold OP on Optimism?"), "OP");
  assert.notEqual(tokenSymbol("What is the gas price on ARB today?"), "ARB");
});

test("a GeckoTerminal token id gives its address on every network, Polygon's included", () => {
  assert.equal(poolTokenAddress("base_0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"), "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");
  assert.equal(poolTokenAddress("polygon_pos_0x8f3cf7ad23cd3cadbd9735aff958023239c6a063"), "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063");
  assert.equal(poolTokenAddress("eth_not-an-address"), null);
  assert.equal(poolTokenAddress(undefined), null);
});

/**
 * G217: since 2026-10-27 Blockscout's Base, Arbitrum and Polygon hosts answer 403
 * (a Cloudflare challenge) to Vercel and to this machine, while Ethereum and
 * Optimism answer. The stub answers every upstream by URL and records each one
 * asked, so these run offline.
 */
const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status });
const CHALLENGED = /^https:\/\/(?:base|arbitrum|polygon)\.blockscout\.com\//;
const ETH_USDC = KNOWN_TOKENS.ethereum!.USDC!;
const OP_USDC = KNOWN_TOKENS.optimism!.USDC!;
const BASE_USDC = KNOWN_TOKENS.base!.USDC!;
const CRV = "0xD533a949740bb3306d119CC777fa900bA034cd52";

async function withUpstreams<T>(answer: (url: string) => Response, run: (urls: string[]) => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    urls.push(url);
    return answer(url);
  }) as typeof fetch;
  try {
    return await run(urls);
  } finally {
    globalThis.fetch = original;
  }
}

const record = (address: string, holders: number): Response =>
  json({ address_hash: address, symbol: "USDC", name: "USD Coin", holders_count: String(holders), total_supply: "1" });

test("an index that does not answer is unknown, never not_found (G217)", async () => {
  await withUpstreams(() => json({ message: "Just a moment..." }, 403), async () => {
    // The gate's own question (intent-answers.mjs TOKEN_HOLDER_COUNT).
    const r = await lookupHolders(`How many addresses hold the token ${BASE_USDC} on base?`);
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "upstream_unavailable");
    assert.equal(r.holders, null);
    assert.match(r.reason, /index outage rather than a token with no holders/);
  });
});

test("with no chain named, chains that did not answer are named and the verdict is unknown", async () => {
  const answer = (url: string): Response => (CHALLENGED.test(url) ? json({}, 403) : json({ message: "Not found" }, 404));
  await withUpstreams(answer, async () => {
    const r = await lookupHolders(`How many addresses hold ${BASE_USDC}?`);
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "upstream_unavailable");
    // Before G217 this said "The index answered; it holds no such token" about
    // three chains that never answered.
    assert.match(r.reason, /is indexed on Ethereum and Optimism, and the indexes for Base, Arbitrum and Polygon did not answer/);
    assert.doesNotMatch(r.reason, /The index answered/);
  });
});

test("a listed symbol reads the table's contract and never asks GeckoTerminal", async () => {
  const answer = (url: string): Response =>
    url === `https://optimism.blockscout.com/api/v2/tokens/${OP_USDC}` ? record(OP_USDC, 661506) : json({}, 500);
  await withUpstreams(answer, async (urls) => {
    const r = await lookupHolders("How many addresses hold usdc on optimism?");
    assert.equal(r.verdict, "holder_count");
    assert.equal(r.holders, 661506);
    assert.equal(r.address, OP_USDC);
    assert.deepEqual(urls, [`https://optimism.blockscout.com/api/v2/tokens/${OP_USDC}`]);
    // Native USDC, not a bridged USDC.e, is what was counted, and the answer says so.
    assert.match(r.reason, /Circle's native USDC contract was read/);
  });
  // The symbol parameter, in any letter case, takes the same path.
  await withUpstreams(answer, async (urls) => {
    const r = await lookupHolders("How many holders?", { symbol: "usdc", chain: "optimism" });
    assert.equal(r.holders, 661506);
    assert.ok(!urls.some((u) => u.includes("geckoterminal")), urls.join(" "));
  });
});

test("an unlisted symbol resolves through the explorer's own search, never GeckoTerminal (G230)", async () => {
  const crv = { address_hash: CRV, symbol: "CRV", name: "Curve DAO Token", holders_count: "90000", total_supply: "1" };
  const answer = (url: string): Response => {
    if (url.startsWith("https://api.geckoterminal.com/")) throw new Error("GeckoTerminal is barred and must not be called");
    if (url.startsWith("https://eth.blockscout.com/api/v2/tokens?q=CRV")) return json({ items: [crv] });
    if (url === `https://eth.blockscout.com/api/v2/tokens/${CRV}`) return json(crv);
    return json({}, 500);
  };
  process.env.LICENCE_GATE = "on"; // the gated path; production runs with the gate off since 2026-11-07
  try {
    await withUpstreams(answer, async (urls) => {
      const r = await lookupHolders("How many addresses hold CRV on ethereum?");
      assert.equal(r.verdict, "holder_count");
      assert.equal(r.address, CRV);
      assert.ok(!urls.some((u) => u.includes("geckoterminal")), urls.join(", "));
      assert.doesNotMatch(r.reason, /Circle's native USDC/);
    });
  } finally {
    delete process.env.LICENCE_GATE;
  }
});

test("with no chain named, a count from the chains that answered says which did not", async () => {
  const answer = (url: string): Response => {
    if (CHALLENGED.test(url)) return json({}, 403);
    if (url === `https://eth.blockscout.com/api/v2/tokens/${ETH_USDC}`) return record(ETH_USDC, 9539060);
    if (url === `https://optimism.blockscout.com/api/v2/tokens/${OP_USDC}`) return record(OP_USDC, 661506);
    return json({}, 500);
  };
  await withUpstreams(answer, async (urls) => {
    const r = await lookupHolders("How many holders does USDC have?");
    assert.equal(r.verdict, "holder_count");
    assert.equal(r.chain, "ethereum");
    assert.equal(r.holders, 9539060);
    assert.match(r.reason, /also indexed on Optimism\./);
    assert.match(r.reason, /The indexes for Base, Arbitrum and Polygon did not answer, so those chains were not compared\./);
    assert.ok(!urls.some((u) => u.includes("geckoterminal")), urls.join(" "));
  });
});
