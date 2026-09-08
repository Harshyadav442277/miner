import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chainTvl, contractAddress, human, lookupTvl, poolLiquidity, protocolSlugs, protocolSubject,
  protocolTvl, resolveChain, resolveScope, supportedChains,
} from "../src/tvl";

// USDC on Base — the address in the canonical intent description's own worked
// example, which is a TOKEN POOL LIQUIDITY question, not a protocol lookup.
const USDC_BASE = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const CANONICAL_Q =
  "For the token at contract 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913 on base, how deep is " +
  "its own trading liquidity in DEX pools (e.g. Uniswap)? Give this token's pool liquidity in USD.";

test("the canonical example resolves to token pool liquidity on base", () => {
  // Getting this wrong is the whole failure mode: measured against champion 49,
  // the right scope scores ~0.29 and the wrong one ~0.003.
  assert.equal(resolveScope({}, CANONICAL_Q), "token_pool");
  assert.equal(resolveChain("", CANONICAL_Q), "base");
});

test("a protocol question resolves to protocol, not chain", () => {
  assert.equal(resolveScope({}, "What is the total value locked in the Aave protocol right now?"), "protocol");
  assert.equal(resolveScope({}, "How much TVL does Uniswap have?"), "protocol");
});

test("a chain question resolves to chain, not protocol", () => {
  assert.equal(resolveScope({}, "How much TVL is on the Base chain?"), "chain");
  assert.equal(resolveScope({}, "What is the total value locked on Arbitrum?"), "chain");
});

test("a protocol named with a chain is still a protocol question", () => {
  // "Aave's TVL on Base" names a chain but asks about a protocol. Reading the
  // chain word as the subject would answer a different question entirely.
  assert.equal(resolveScope({}, "What is Aave's TVL on Base?"), "protocol");
  assert.equal(resolveScope({}, "How much is locked in Uniswap on Polygon?"), "protocol");
});

test("an explicit parameter outranks the prose", () => {
  assert.equal(resolveScope({ address: USDC_BASE }, "how much TVL is on base"), "token_pool");
  assert.equal(resolveScope({ protocol: "Aave" }, "how much TVL is on base"), "protocol");
});

test("contractAddress finds and lowercases an EVM address, and rejects a hash", () => {
  assert.equal(contractAddress(CANONICAL_Q), USDC_BASE);
  assert.equal(contractAddress("0x833589FCD6EDB6E08F4C7C32D4F71B54BDA02913"), USDC_BASE);
  // A 64-hex transaction hash is a different intent's subject.
  assert.equal(contractAddress("0x" + "a".repeat(64)), null);
  assert.equal(contractAddress("no address here"), null);
});

test("protocolSubject reads the protocol out of the question, or gives up", () => {
  assert.equal(protocolSubject("What is the total value locked in Aave right now?"), "Aave");
  assert.equal(protocolSubject("How much TVL does Uniswap have?"), "Uniswap");
  assert.equal(protocolSubject("What is Curve's TVL?"), "Curve");
  // Curly apostrophe: what a real question actually contains when it is typed
  // or pasted from a document rather than written in ASCII.
  assert.equal(protocolSubject("What is Curve’s TVL?"), "Curve");
  assert.equal(protocolSubject("What is Rocket Pool's total value locked?"), "Rocket Pool");
  assert.equal(protocolSubject("How much is locked in Lido today?"), "Lido");
  // Nothing nameable — an empty string, so the caller refuses rather than
  // looking up a guessed protocol.
  assert.equal(protocolSubject("What is the TVL?"), "");
  assert.equal(protocolSubject("tell me about defi"), "");
});

test("protocolSlugs puts the alias first and derives plausible fallbacks", () => {
  assert.equal(protocolSlugs("Curve Finance")[0], "curve-dex");
  assert.ok(protocolSlugs("Aave").includes("aave"));
  assert.deepEqual(protocolSlugs(""), []);
  // No duplicates — each slug costs a request inside an 11s watchdog.
  const s = protocolSlugs("Yearn");
  assert.equal(s.length, new Set(s).size);
});

test("human keeps the magnitude readable without losing the exact figure", () => {
  assert.equal(human(18_083_464_381), "$18.08 billion");
  assert.equal(human(5_564_272_633), "$5.56 billion");
  assert.equal(human(209_368_856), "$209.37 million");
  assert.equal(human(1_500), "$1.50 thousand");
  assert.equal(human(42), "$42");
});

test("supportedChains covers the chains the manifest advertises", () => {
  for (const c of ["ethereum", "base", "arbitrum", "optimism", "polygon", "bsc", "avalanche", "solana"]) {
    assert.ok(supportedChains().includes(c), `${c} missing`);
  }
});

/* ---------------------------------------------------------------------------
 * Upstream failure must never be dressed as an answer. These use a stubbed
 * fetch so the distinction is tested deterministically rather than waiting for
 * a provider to have a bad day.
 * ------------------------------------------------------------------------- */

async function withFetch<T>(impl: typeof globalThis.fetch, fn: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  try { return await fn(); } finally { globalThis.fetch = original; }
}
const failing = (async () => { throw new Error("network down"); }) as unknown as typeof globalThis.fetch;
const notFound = (async () => new Response("Protocol not found", { status: 400 })) as typeof globalThis.fetch;

test("a dead provider is unknown, never zero", async () => {
  await withFetch(failing, async () => {
    assert.equal(await protocolTvl("Aave"), "unavailable");
    assert.equal(await chainTvl("base"), "unavailable");
    assert.equal(await poolLiquidity(USDC_BASE, "base"), "unavailable");

    const r = await lookupTvl("protocol", "Aave", null);
    assert.equal(r.verdict, "unknown");
    assert.equal(r.usd, null);
    assert.equal(r.error, "provider_unavailable");
    // The wording must not read as a claim about the protocol.
    assert.ok(!/\$0\b|zero|no value locked/i.test(r.reason));
    assert.match(r.reason, /availability problem/i);
  });
});

test("a provider that says the protocol does not exist is not_found, not unknown", async () => {
  // A 400 from DefiLlama is an answer about the slug; a timeout is not. Merging
  // them would either invent a missing protocol or deny a real one.
  await withFetch(notFound, async () => {
    assert.equal(await protocolTvl("not-a-real-protocol-xyz"), null);
    const r = await lookupTvl("protocol", "not-a-real-protocol-xyz", null);
    assert.equal(r.verdict, "not_found");
    assert.equal(r.usd, null);
  });
});

test("an unreadable chain is refused rather than answered from another chain", async () => {
  const r = await lookupTvl("chain", "fantom", null);
  assert.equal(r.verdict, "not_found");
  assert.equal(r.usd, null);
  assert.ok(!/\$[\d,]{4,}/.test(r.reason), "no figure may appear for a chain we did not read");
});

/* --------------------------------- live ---------------------------------- */

test("protocol TVL comes back as a real figure with its scope named (live)", async () => {
  const r = await lookupTvl("protocol", "Aave", null);
  if (r.verdict === "unknown") return;   // provider down is not a test failure
  assert.equal(r.verdict, "found");
  assert.ok(r.usd !== null && r.usd > 1e8, `implausible Aave TVL: ${r.usd}`);
  assert.match(r.reason, /total value locked/i);
  assert.match(r.reason, /DefiLlama/);
  // The scope must be stated, because the incumbent failure is a protocol
  // figure served for a different scope's question.
  assert.match(r.reason, /across every chain/i);
  assert.ok(!/market cap/i.test(r.reason.replace(/not the market cap[^.]*\./i, "")));
});

test("chain TVL is the chain's aggregate, and says so (live)", async () => {
  const r = await lookupTvl("chain", "Base", "base");
  if (r.verdict === "unknown") return;
  assert.equal(r.verdict, "found");
  assert.ok(r.usd !== null && r.usd > 1e7, `implausible Base TVL: ${r.usd}`);
  assert.match(r.reason, /Base chain/);
  assert.match(r.reason, /aggregate TVL/i);
});

test("the canonical token question returns that token's pool liquidity (live)", async () => {
  const r = await lookupTvl("token_pool", USDC_BASE, "base");
  if (r.verdict === "unknown") return;
  assert.equal(r.verdict, "found");
  assert.ok(r.usd !== null && r.usd > 1e6, `implausible USDC/base pool liquidity: ${r.usd}`);
  assert.match(r.reason, /USDC/);
  assert.match(r.reason, /pool liquidity/i);
  // Liquidity is not market cap, and USDC's market cap is ~350x its pool
  // liquidity — serving one for the other is the error worth pinning.
  assert.ok(r.usd < 5e10, "figure is the size of a market cap, not pool liquidity");
  assert.match(r.reason, /not the token's market capitalisation/i);
});

test("a token with no pools is not_found, with no invented figure (live)", async () => {
  // A well-formed address that is not a traded token on that chain.
  const r = await lookupTvl("token_pool", "0x000000000000000000000000000000000000dead", "base");
  if (r.verdict === "unknown") return;
  assert.equal(r.verdict, "not_found");
  assert.equal(r.usd, null);
  assert.ok(!/\$[\d,]{4,}/.test(r.reason), "no dollar figure may appear for a token we found nothing for");
});
