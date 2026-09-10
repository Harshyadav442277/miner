import { walletQuantity } from "./wallet-rpc";

// Issuer sources verified 2026-09-11 IST:
// https://developers.circle.com/stablecoins/usdc-contract-addresses
// https://tether.to/en/supported-protocols/
// These are native USDC contracts, not bridged USDC.e or USDbC.
const USDC: Record<string, string> = {
  ethereum: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  base: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  arbitrum: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
  optimism: "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
  polygon: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
};

export interface TokenBalance {
  symbol: string;
  contract: string | null;
  amount: string | null;
  error?: string;
}

export function requestedTokens(text: string): string[] {
  return [...new Set((text.match(/\b(?:USDC(?:\.e)?|USDT|USDbC|DAI|WETH|WBTC)\b/gi) ?? [])
    .map(s => s.toUpperCase() === "USDC.E" ? "USDC.e" : s.toUpperCase()))];
}

export async function tokenBalances(
  symbols: string[], chain: string, address: string, urls: readonly string[], timeoutMs: number,
): Promise<TokenBalance[]> {
  return Promise.all(symbols.map(async symbol => {
    const contract = symbol === "USDC" ? USDC[chain] : symbol === "USDT" && chain === "ethereum"
      ? "0xdac17f958d2ee523a2206206994597c13d831ec7" : undefined;
    if (!contract) return { symbol, contract: null, amount: null, error: "unsupported_token" };
    const raw = await walletQuantity(urls, "eth_call", [{
      to: contract, data: `0x70a08231${address.slice(2).toLowerCase().padStart(64, "0")}`,
    }, "latest"], timeoutMs, true);
    if (raw === null) return { symbol, contract, amount: null, error: "upstream_unavailable" };
    // All contracts above use six decimal places. Preserve all base units.
    const fraction = (raw % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
    return { symbol, contract, amount: `${raw / 1_000_000n}${fraction ? `.${fraction}` : ""}` };
  }));
}
