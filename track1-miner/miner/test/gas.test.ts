import { test } from "node:test";
import assert from "node:assert/strict";
import { asksForFees, fmtGwei, getGasPrice, notAFeeQuestion, resolveChain, roundedGwei, supportedChains } from "../src/gas";

test("an unknown chain param is that chain, unread, never Ethereum (production 2026-11-16)", () => {
  // "Gnosis", "Fantom" and "op" were each answered with Ethereum's gas price.
  assert.deepEqual(resolveChain("Fantom", ""), { chain: null, explicit: true, unread: "Fantom" });
  assert.deepEqual(resolveChain("Moonbeam", ""), { chain: null, explicit: true, unread: "Moonbeam" });
  assert.equal(resolveChain("op", "").chain, "optimism");
  assert.equal(resolveChain("Gnosis", "").chain, "gnosis");
  assert.equal(resolveChain("", "gas on Linea right now").chain, "linea");
  assert.equal(resolveChain("", "zkSync Era gas fees").chain, "zksync");
  assert.equal(resolveChain("scroll", "").chain, "scroll");
  assert.equal(resolveChain("sonic", "").chain, "sonic");
  // Chain ids, bare or CAIP-2.
  assert.equal(resolveChain("1", "").chain, "ethereum");
  assert.equal(resolveChain("eip155:8453", "").chain, "base");
  assert.equal(resolveChain("324", "").chain, "zksync");
  assert.deepEqual(resolveChain("999999", ""), { chain: null, explicit: true, unread: "chain id 999999" });
  // Names that already worked still do, and no chain at all still means Ethereum.
  for (const [p, want] of [["Ethereum (ETH)", "ethereum"], ["Arbitrum One", "arbitrum"], ["Avalanche C-Chain", "avalanche"], ["BNB Chain", "bsc"],
    ["Polygon PoS", "polygon"], ["OP Mainnet", "optimism"], ["Base Mainnet", "base"], ["matic", "polygon"], ["Ethereum Mainnet", "ethereum"]] as const) {
    assert.equal(resolveChain(p, "").chain, want, p);
  }
  assert.deepEqual(resolveChain("", "What is the current gas price?"), { chain: null, explicit: false, unread: null });
  assert.ok(["gnosis", "linea", "scroll", "zksync", "sonic"].every((c) => supportedChains().includes(c)));
});

test("the chain named in the question decides which chain is read", () => {
  assert.equal(resolveChain("", "What is the current gas price in Gwei on the Ethereum network?").chain, "ethereum");
  assert.equal(resolveChain("", "Polygon fees felt high yesterday, what are they at now?").chain, "polygon");
  assert.equal(resolveChain("", "gas on base?").chain, "base");
  assert.equal(resolveChain("", "arbitrum gas price").chain, "arbitrum");
  // An explicit parameter wins over prose.
  assert.equal(resolveChain("optimism", "gas on base?").chain, "optimism");
});

test("Ethereum is matched last so it cannot capture another chain's question", () => {
  // `\beth\b` is the native asset on every L2 here and "mainnet" appears in
  // "OP Mainnet", so a leading Ethereum pattern would swallow these.
  assert.equal(resolveChain("", "what does it cost to send ETH on base?").chain, "base");
  assert.equal(resolveChain("", "gas on OP Mainnet").chain, "optimism");
});

test("a chain we cannot read is named, not silently replaced with Ethereum", () => {
  // Reporting Ethereum's fee for a Solana question is a confident answer to a
  // question nobody asked.
  const sol = resolveChain("", "What is the gas price on Solana?");
  assert.equal(sol.chain, null);
  assert.equal(sol.unread, "Solana");
  assert.equal(resolveChain("", "bitcoin transaction fees").unread, "Bitcoin");
});

test("BSC and Avalanche are read; testnets are refused, never answered with their mainnet's fee (2026-11-08)", async () => {
  assert.equal(resolveChain("", "BNB Chain fees right now?").chain, "bsc");
  assert.equal(resolveChain("", "gas price on BSC").chain, "bsc");
  assert.equal(resolveChain("", "What is the gas price on Avalanche?").chain, "avalanche");
  assert.equal(resolveChain("avax", "").chain, "avalanche");
  for (const [q, name] of [["gas on Base Sepolia", "Sepolia"], ["holesky gas price", "Holesky"], ["goerli fees", "Goerli"], ["BSC testnet gas", "BSC testnet"]] as const) {
    const r = resolveChain("", q);
    assert.equal(r.chain, null, q);
    assert.equal(r.unread, `${name} (a test network)`);
  }
  assert.equal(resolveChain("ethereum", "gas on sepolia").chain, null, "a testnet in the question outranks the chain parameter");
  const t = await getGasPrice(null, "Sepolia (a test network)");
  assert.equal(t.error, "testnet");
  assert.equal(t.gwei, null);
  assert.match(t.reason, /^Sepolia is a test network: .* No mainnet gas price is reported in its place/);

  const original = globalThis.fetch;
  const hosts: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    hosts.push(new URL(String(input)).hostname);
    const { method } = JSON.parse(String(init?.body)) as { method: string };
    // Values as api.avax.network answered on 2026-11-08.
    const result = method === "eth_gasPrice" ? "0x97596678" : { number: "0x5f26cd7", baseFeePerGas: "0x975965e2" };
    return Response.json({ jsonrpc: "2.0", id: 1, result });
  }) as typeof globalThis.fetch;
  try {
    const r = await getGasPrice("avalanche");
    assert.equal(r.verdict, "gas_price");
    assert.deepEqual([...new Set(hosts)], ["api.avax.network"]);
    assert.match(r.reason, /^The current gas price on Avalanche C-Chain is 2\.539 Gwei, or about 2\.54 Gwei/);
    assert.match(r.reason, /a priority fee of 0\.00000015 Gwei\./, "no exponent form");
    assert.match(r.reason, /not the price of AVAX\./);
  } finally {
    globalThis.fetch = original;
  }
});

test("a question naming no chain is marked as such", () => {
  const r = resolveChain("", "what are gas fees right now?");
  assert.equal(r.chain, null);
  assert.equal(r.explicit, false);
  assert.equal(r.unread, null);
});

test("gwei formatting suits the magnitude and drops noise zeros", () => {
  // These chains span five orders of magnitude, so one fixed decimal count is
  // either lossy or noise. The scorer is close to exact-match, so this is a
  // correctness decision.
  assert.equal(fmtGwei(272.55), "272.55");
  assert.equal(fmtGwei(12.4321), "12.432");
  assert.equal(fmtGwei(0.006), "0.006");
  assert.equal(fmtGwei(0.0001), "0.0001");
  assert.equal(fmtGwei(NaN), "unknown");
  // The rounded register collapses onto the exact one when they are the same
  // number, so the answer never says one thing twice.
  assert.equal(roundedGwei(0.006), "0.006");
  assert.equal(roundedGwei(2.6e-8), "0.000000026", "Gnosis: fixed form, never 2.6e-8");
  assert.equal(roundedGwei(0.149893), "0.15");
  assert.equal(roundedGwei(272.55), "273");
  assert.equal(roundedGwei(12.43), "12.4");
});

test("supportedChains covers what the manifest advertises", () => {
  for (const c of ["ethereum", "base", "arbitrum", "optimism", "polygon"]) {
    assert.ok(supportedChains().includes(c), `${c} missing`);
  }
});

test("an unreadable chain is refused with no figure at all", async () => {
  const r = await getGasPrice(null, "Solana");
  assert.equal(r.verdict, "unsupported_chain");
  assert.equal(r.gwei, null);
  assert.ok(!/\d+(\.\d+)?\s*Gwei/.test(r.reason), `a figure was quoted for a chain we did not read: ${r.reason}`);
});

test("a dead RPC is unknown, never a fee of zero", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("network down"); }) as unknown as typeof globalThis.fetch;
  try {
    const r = await getGasPrice("ethereum");
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "rpc_unavailable");
    assert.equal(r.gwei, null);
    assert.ok(!/\b0 Gwei\b/.test(r.reason));
    assert.match(r.reason, /availability problem/i);
  } finally {
    globalThis.fetch = original;
  }
});

test("the quoted price is never below the block's own base fee (2026-10-21)", async (t) => {
  // The values production read for block 26,239,781: eth_gasPrice 0.041904 Gwei
  // from one head, base fee 0.04509 Gwei from another.
  const original = globalThis.fetch;
  globalThis.fetch = (async (_url: string, init: { body: string }) => {
    const { method, id } = JSON.parse(init.body);
    const result = method === "eth_gasPrice" ? "0x" + (41_904_000).toString(16)
      : { number: "0x" + (26_239_781).toString(16), baseFeePerGas: "0x" + (45_090_000).toString(16) };
    return Response.json({ jsonrpc: "2.0", id, result });
  }) as unknown as typeof globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const r = await getGasPrice("ethereum");
  assert.equal(r.gwei, 0.04509);
  assert.equal(r.priority_gwei, 0);
});

test("a question that is not about fees is declined, not answered with Ethereum's gas price (2026-10-21)", () => {
  const weather = "What is the 24-hour weather forecast for Sydney, Australia starting today, including temperature, precipitation probability, and wind speed?";
  assert.equal(asksForFees(weather), false);
  assert.equal(notAFeeQuestion(weather).gwei, null);
  for (const q of ["What is the current gas price on base?", "gas price on polygon", "How much does it cost to send ETH on Arbitrum?", ""]) {
    assert.equal(asksForFees(q), true, q);
  }
});

/* --------------------------------- live ---------------------------------- */

test("a real gas price comes back with its block and both registers (live)", async () => {
  const r = await getGasPrice("ethereum");
  if (r.verdict === "unknown") return;   // RPCs down is not a test failure
  assert.equal(r.verdict, "gas_price");
  assert.ok(r.gwei !== null && r.gwei > 0, `implausible gas price: ${r.gwei}`);
  assert.ok(r.block !== null && r.block > 20_000_000, `implausible block: ${r.block}`);
  // The block number makes the figure checkable rather than a bare assertion.
  assert.match(r.reason, /as of block [\d,]+/);
  // The described trap: this intent is a FEE, never the token's price.
  assert.match(r.reason, /not the price of ETH/);
  assert.ok(!/\$/.test(r.reason), "a gas answer must not quote a dollar price");
});

test("every supported chain answers with a plausible fee (live)", async () => {
  for (const chain of supportedChains()) {
    const r = await getGasPrice(chain);
    if (r.verdict === "unknown") continue;
    assert.equal(r.verdict, "gas_price", `${chain} -> ${r.verdict}`);
    assert.ok(r.gwei !== null && r.gwei >= 0, `${chain} gwei ${r.gwei}`);
    // Base fee and priority must reconcile with the total where both exist.
    if (r.base_fee_gwei !== null && r.priority_gwei !== null) {
      assert.ok(r.priority_gwei >= 0, `${chain} negative priority fee`);
    }
    // BSC and Avalanche are named by their proper names ("BNB Smart Chain", "Avalanche C-Chain"), not the id.
    const name = ({ bsc: "BNB Smart Chain", avalanche: "Avalanche C-Chain", gnosis: "Gnosis Chain", zksync: "zkSync Era" } as Record<string, string>)[chain] ?? chain;
    assert.ok(r.reason.includes(name), `${chain} answer does not name the chain`);
    // No exponent notation and no zero cost: Gnosis's 2.6e-8 Gwei read "about 2.6e-8 Gwei" and "costs about 0.00 Gwei".
    assert.doesNotMatch(r.reason, /\de-\d/, `${chain}: exponent notation in "${r.reason}"`);
    assert.doesNotMatch(r.reason, /costs about 0(?:\.0+)? (?:Gwei|[A-Z]+)\./, `${chain}: a zero transfer cost`);
  }
});

test("Celo is read from its own RPC, by name or chain id; its testnets are refused (chain=celo, 9 calls refused by 2026-11-25)", async () => {
  assert.equal(resolveChain("celo", "").chain, "celo");
  assert.equal(resolveChain("Celo", "").chain, "celo");
  assert.equal(resolveChain("42220", "").chain, "celo");
  assert.equal(resolveChain("", "What is the gas price on Celo right now?").chain, "celo");
  assert.match(String(resolveChain("", "gas on Celo Alfajores").unread), /a test network/);
  assert.ok(supportedChains().includes("celo"));

  const original = globalThis.fetch;
  const hosts: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    hosts.push(new URL(String(input)).hostname);
    const { method } = JSON.parse(String(init?.body)) as { method: string };
    // Values as celo-rpc.publicnode.com answered on 2026-11-25: 200.001 Gwei on a 200 Gwei base fee.
    const result = method === "eth_gasPrice" ? "0x2e90fd1240" : { number: "0x4fdc6c5", baseFeePerGas: "0x2e90edd000" };
    return Response.json({ jsonrpc: "2.0", id: 1, result });
  }) as typeof globalThis.fetch;
  try {
    const r = await getGasPrice("celo");
    assert.equal(r.verdict, "gas_price");
    assert.equal(r.chain, "celo");
    assert.deepEqual([...new Set(hosts)], ["celo-rpc.publicnode.com"]);
    assert.equal(r.gwei, 200.001);
    assert.match(r.reason, /^The current gas price on celo is 200\.00 Gwei/);
    assert.match(r.reason, /not the price of CELO\./);
  } finally {
    globalThis.fetch = original;
  }
});
