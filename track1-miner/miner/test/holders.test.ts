import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chainLabel, concentrationPercent, contractAddress, lookupHolders, resolveChain,
  supportedChains, tokenSymbol, wantsConcentration,
} from "../src/holders";

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

test("the concentration percentage is the top balance over supply, and refuses nonsense", () => {
  assert.equal(concentrationPercent(237934679745985, "4275762984402800"), 5.56);
  assert.equal(concentrationPercent(1, "0"), null);
  assert.equal(concentrationPercent(1, null), null);
  // A top balance larger than supply means the two numbers are not comparable,
  // so no figure is reported rather than a wrong one.
  assert.equal(concentrationPercent(10, "5"), null);
});
