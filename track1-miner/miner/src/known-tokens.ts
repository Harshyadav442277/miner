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

/** The listed contract for a symbol on a chain, in any letter case, or null. Pure. */
export function knownToken(chain: string, symbol: string): string | null {
  return KNOWN_TOKENS[chain]?.[symbol.trim().toUpperCase()] ?? null;
}
