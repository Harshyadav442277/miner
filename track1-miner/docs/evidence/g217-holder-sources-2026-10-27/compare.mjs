// G217: holder counts for one token set from every keyless source that answers, side by side.
// Blockscout is the miner's current source; GeckoTerminal token info and Ethplorer (public "freekey",
// Ethereum only) are the candidates. Calls are spaced for GeckoTerminal's free rate limit.
//   node compare.mjs > compare.json
const TOKENS = {
  ethereum: { USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7", DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F", WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", LINK: "0x514910771AF9Ca656af840dff83E8264EcF986CA", UNI: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", AAVE: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9" },
  optimism: { USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", WETH: "0x4200000000000000000000000000000000000006", DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", OP: "0x4200000000000000000000000000000000000042" },
  base: { USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", WETH: "0x4200000000000000000000000000000000000006", DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb" },
  arbitrum: { USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", ARB: "0x912CE59144191C1204E64559FE8253a0e49E6548" },
  polygon: { USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" },
};
const GECKO = { ethereum: "eth", optimism: "optimism", base: "base", arbitrum: "arbitrum", polygon: "polygon_pos" };
const SCOUT = { ethereum: "eth", optimism: "optimism", base: "base", arbitrum: "arbitrum", polygon: "polygon" };
const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function json(url) {
  const t = Date.now();
  try {
    const r = await fetch(url, { headers: { accept: "application/json", "user-agent": UA }, signal: AbortSignal.timeout(20_000) });
    const ms = Date.now() - t;
    if (!r.ok) return { status: r.status, ms, body: null };
    return { status: r.status, ms, body: await r.json() };
  } catch (e) {
    return { status: null, ms: Date.now() - t, body: null, error: String(e.message ?? e) };
  }
}

const rows = [];
for (const [chain, tokens] of Object.entries(TOKENS)) {
  for (const [symbol, address] of Object.entries(tokens)) {
    const gecko = await json(`https://api.geckoterminal.com/api/v2/networks/${GECKO[chain]}/tokens/${address}/info`);
    const scout = await json(`https://${SCOUT[chain]}.blockscout.com/api/v2/tokens/${address}`);
    const ethplorer = chain === "ethereum" ? await json(`https://api.ethplorer.io/getTokenInfo/${address}?apiKey=freekey`) : null;
    const h = gecko.body?.data?.attributes?.holders;
    rows.push({
      chain, symbol, address,
      gecko: { status: gecko.status, ms: gecko.ms, count: h?.count ?? null, last_updated: h?.last_updated ?? null },
      blockscout: { status: scout.status, ms: scout.ms, count: scout.body ? Number(scout.body.holders_count ?? scout.body.holders) : null },
      ethplorer: ethplorer ? { status: ethplorer.status, ms: ethplorer.ms, count: ethplorer.body?.holdersCount ?? null } : null,
    });
    await sleep(2_500);
  }
}
console.log(JSON.stringify({ checked_at: new Date().toISOString(), rows }, null, 1));
