/**
 * The major tokens' contracts, so the common symbol questions skip the resolver
 * (GeckoTerminal's pool search, holders.ts addressForSymbol). Read by
 * /token-supply (G213: 437–3055 ms on production for four fresh symbols,
 * 148–162 ms by address) and /token-holders (G217: GeckoTerminal allows 10 calls
 * a minute free, and the symbol lookup timed out at 6 s on production on
 * 2026-10-27).
 *
 * Each entry was checked on 2026-10-27 against two of: Circle's published USDC
 * addresses, the contract's own symbol(), Blockscout's token record, and the
 * GeckoTerminal resolver this replaces (evidence/g213-token-table-2026-10-27).
 * Anything not listed still goes through addressForSymbol.
 */
export const KNOWN_TOKENS: Record<string, Record<string, string>> = {
  ethereum: { USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7", DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F", WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", LINK: "0x514910771AF9Ca656af840dff83E8264EcF986CA" },
  base: { USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", WETH: "0x4200000000000000000000000000000000000006", DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb" },
  arbitrum: { USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" },
  optimism: { USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", WETH: "0x4200000000000000000000000000000000000006", DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" },
  polygon: { USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" },
};

/** Said with the answer when a listed symbol has a look-alike on the same chain. */
export const TABLE_NOTE: Record<string, string> = {
  USDC: "Circle's native USDC contract was read; a bridged USDC.e, where one exists, is a separate contract.",
  USDT: "Tether's contract was read; on Arbitrum and Polygon it now reports its symbol as USDT0.",
};

/** Token names asked for in place of their symbols. A name is never sent to the resolver, which matched one to a look-alike. */
export const TOKEN_NAMES: Record<string, string> = { TETHER: "USDT", USDCOIN: "USDC", CHAINLINK: "LINK", WRAPPEDETHER: "WETH", WRAPPEDBITCOIN: "WBTC" };

export interface NativeCoin { symbol: string; of: string; wrapped: string | null; note: string }

/**
 * Chains' own coins, by symbol and by name. None is an ERC-20 contract, so none has a totalSupply() to read, and
 * the resolver must not be asked: token=ethereum read a contract named "ETHEREUM" (1,000,000,000) and
 * token=solana a meme token (888,888,888,888,888), comparison with the top miners, 2026-11-08.
 */
const NATIVE: NativeCoin[] = [
  { symbol: "ETH", of: "Ethereum (and the gas coin of Base, Arbitrum and Optimism)", wrapped: "WETH", note: "Its supply is set by protocol issuance and the EIP-1559 burn, which is not a contract value." },
  { symbol: "BTC", of: "Bitcoin", wrapped: "WBTC", note: "Bitcoin is not an EVM chain, and its supply is set by the protocol's issuance schedule." },
  { symbol: "SOL", of: "Solana", wrapped: null, note: "Solana is not an EVM chain, and Solana SPL tokens are not read here." },
  { symbol: "BNB", of: "BNB Smart Chain", wrapped: null, note: "An ERC-20 representation on another chain is a separate contract: send its address to read it." },
  { symbol: "POL", of: "Polygon PoS (formerly MATIC)", wrapped: null, note: "POL and MATIC also exist as ERC-20 contracts on Ethereum: send the contract address to read one." },
  { symbol: "AVAX", of: "Avalanche C-Chain", wrapped: null, note: "An ERC-20 representation on another chain is a separate contract: send its address to read it." },
];
const NATIVE_ALIASES: Record<string, string> = {
  ETH: "ETH", ETHER: "ETH", ETHEREUM: "ETH", BTC: "BTC", XBT: "BTC", BITCOIN: "BTC", SOL: "SOL", SOLANA: "SOL",
  BNB: "BNB", MATIC: "POL", POL: "POL", POLYGON: "POL", AVAX: "AVAX", AVALANCHE: "AVAX",
};

/** The native coin a symbol or name stands for, or null. Pure. */
export function nativeCoin(symbolOrName: string): NativeCoin | null {
  const s = NATIVE_ALIASES[symbolOrName.replace(/[\s-]+/g, "").toUpperCase()];
  return s ? NATIVE.find((c) => c.symbol === s) ?? null : null;
}

/** The listed contract for a symbol on a chain, in any letter case, or null. Pure. */
export function knownToken(chain: string, symbol: string): string | null {
  return KNOWN_TOKENS[chain]?.[symbol.trim().toUpperCase()] ?? null;
}
