/**
 * The spellings of a chain name the `chain` parameter has to accept.
 *
 * The node builds our request with an LLM, so the value it puts in an optional
 * parameter is whatever that model writes, not what our manifest spells. The
 * parameter path only ever accepted an exact `RPCS` key, while the PROSE path
 * next to it (`CHAIN_WORDS`) has always read `eth`, `arb`, `matic`, `bnb` and
 * `avax`. The same word was therefore understood in the question and refused in
 * the parameter.
 *
 * Measured against production on 2026-09-19, scored under champion reg642
 * against the two miners that cross this intent (txlens, veyctum — they agree
 * with each other at 0.9961, which is the bench gate):
 *
 *   /tx-lookup?hash=<h>&chain=ethereum    0.996209   the receipt
 *   /tx-lookup?hash=<h>&chain=eth         0.005629   "not one this endpoint reads"
 *   /tx-lookup?hash=<h>&chain=mainnet     0.005103   "not one this endpoint reads"
 *   /tx-lookup?hash=<h>&chain=1           0.004076   "not one this endpoint reads"
 *
 * One token in one optional parameter is the whole intent. livecert has scored
 * between 0.0089 and 0.0127 in every epoch from 288 to 343 — the refusal and
 * wrong-subject bands — and has never once reached the 0.99 band, while
 * WALLET_BALANCE_CHECK, whose endpoint declares no chain parameter at all,
 * scores 0.9999997 in the same epochs.
 *
 * Refusing a chain we genuinely cannot read stays correct: Solana and Bitcoin
 * are not EVM and must never be answered from Ethereum's reading of the hash.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isSupportedChain, readChainName, resolveChain } from "../src/onchain";

test("a chain we read is accepted however it is spelled", () => {
  const spellings: Array<[string, string]> = [
    ["eth", "ethereum"], ["ETH", "ethereum"], ["Ethereum", "ethereum"],
    ["mainnet", "ethereum"], ["ethereum mainnet", "ethereum"], ["ETH_MAINNET", "ethereum"],
    ["ethereum-mainnet", "ethereum"], ["l1", "ethereum"], ["1", "ethereum"], ["eip155:1", "ethereum"],
    ["base", "base"], ["Base Mainnet", "base"], ["8453", "base"],
    ["arb", "arbitrum"], ["arbitrum one", "arbitrum"], ["42161", "arbitrum"],
    ["op", "optimism"], ["OP Mainnet", "optimism"], ["10", "optimism"],
    ["matic", "polygon"], ["polygon pos", "polygon"], ["137", "polygon"],
    ["bnb", "bsc"], ["BNB Chain", "bsc"], ["binance smart chain", "bsc"], ["56", "bsc"],
    ["avax", "avalanche"], ["avalanche c-chain", "avalanche"], ["43114", "avalanche"],
  ];
  for (const [written, expected] of spellings) {
    assert.deepEqual(readChainName(written), { kind: "named", chain: expected }, `chain=${written}`);
    assert.equal(isSupportedChain(written), true, `chain=${written}`);
    assert.equal(resolveChain(written, "").chain, expected, `chain=${written}`);
  }
});

/**
 * A model filling an optional parameter it has no value for writes a placeholder
 * rather than leaving it out. That is not the name of a chain, so it must be
 * read as "no chain given" — which puts the lookup on the path that searches
 * every chain — and never as a chain we cannot read.
 */
test("a placeholder names no chain rather than an unreadable one", () => {
  for (const filler of ["", "   ", "unknown", "null", "undefined", "none", "n/a", "na",
    "any", "all", "auto", "default", "evm", "-", "chain", "blockchain"]) {
    assert.deepEqual(readChainName(filler), { kind: "unset" }, `chain=${filler}`);
  }
  // Nothing named at all still defaults to Ethereum as a reading ORDER, with
  // `explicit` false so a miss there is searched rather than denied.
  assert.deepEqual(resolveChain("unknown", "what is the status of this transaction?"),
    { chain: "ethereum", conflict: null, explicit: false });
});

/**
 * The counterexample, and the reason this is a lookup table rather than a
 * shrug: a chain we cannot read must still be refused. Answering a Solana or
 * Bitcoin hash from Ethereum is the confidently-wrong failure the refusal
 * exists to prevent.
 */
test("a chain this endpoint cannot read is still refused", () => {
  for (const other of ["solana", "sol", "bitcoin", "btc", "tron", "sui", "aptos",
    "cardano", "near", "ripple", "cosmos", "starknet", "zksync", "sepolia", "goerli"]) {
    assert.deepEqual(readChainName(other), { kind: "unreadable" }, `chain=${other}`);
    assert.equal(isSupportedChain(other), false, `chain=${other}`);
  }
});

/**
 * An alias in the parameter is the caller's choice exactly as the full name is,
 * so it keeps winning over a chain word in the prose and keeps reporting the
 * disagreement instead of hiding it.
 */
test("an aliased parameter still beats the prose and still reports the conflict", () => {
  assert.deepEqual(resolveChain("arb", "this transaction on polygon"),
    { chain: "arbitrum", conflict: "polygon", explicit: true });
  assert.deepEqual(resolveChain("eth", "on ethereum"),
    { chain: "ethereum", conflict: null, explicit: true });
});
