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

/**
 * The wallet a question asks about and the token contract it names beside it. The intent's request carries
 * `token` as a contract address (Daemon feed 2026-11-25: address 0x3e40…, token 0x5A98… on ethereum), and with two
 * addresses in the question the first one was read as the wallet: the token contract's own ETH balance (0) was
 * answered where a1-preflight read 128,086,165.18 LDO. An address is the token when "token", "contract" or "ERC-20"
 * introduces it, or a ticker's parenthesis ("LDO (0x…)") holds it. With one address, or none so marked, the first
 * address is the wallet and no token is read. Pure.
 */
export function walletAndToken(text: string): { wallet: string | null; token: string | null } {
  const s = String(text ?? "");
  const found: Array<{ addr: string; at: number }> = [];
  for (const m of s.matchAll(/0x[a-fA-F0-9]{40}\b/g)) {
    if (!found.some((f) => f.addr.toLowerCase() === m[0].toLowerCase())) found.push({ addr: m[0], at: m.index });
  }
  const first = found[0]?.addr ?? null;
  if (found.length < 2) return { wallet: first, token: null };
  const isToken = (at: number): boolean => {
    const before = s.slice(Math.max(0, at - 40), at);
    return /\b(?:token|contract|erc-?20)(?:\s+(?:contract|address|at|is))*\s*[:=]?\s*\(?\s*$/i.test(before)
      || /\b[A-Z][A-Z0-9]{1,9}\s*\(\s*$/.test(before);
  };
  const token = found.find((f) => isToken(f.at))?.addr ?? null;
  if (!token) return { wallet: first, token: null };
  return { wallet: found.find((f) => f.addr !== token)?.addr ?? null, token };
}

/** An ABI-encoded string return, or a bytes32 one (MKR); null when neither. Pure. */
export function abiText(hex: unknown): string | null {
  const h = typeof hex === "string" ? hex.replace(/^0x/, "") : "";
  const text = (x: string): string | null => {
    const t = Buffer.from(x, "hex").toString("utf8").replace(/\0+$/, "");
    return /^[\x20-\x7e]{1,20}$/.test(t) ? t : null;
  };
  if (h.length === 64) return text(h);
  if (h.length < 128 || !/^[\da-f]+$/i.test(h)) return null;
  const len = parseInt(h.slice(64, 128), 16);
  return len > 0 && len <= 32 ? text(h.slice(128, 128 + len * 2)) : null;
}

/** A whole-unit decimal string of `raw` base units, exact, without trailing zeros. Pure. */
export function wholeUnits(raw: bigint, decimals: number): string {
  if (!decimals) return raw.toString();
  const s = raw.toString().padStart(decimals + 1, "0");
  const frac = s.slice(-decimals).replace(/0+$/, "");
  return `${s.slice(0, -decimals)}${frac ? `.${frac}` : ""}`;
}

async function callSymbol(urls: readonly string[], contract: string, timeoutMs: number): Promise<string | null> {
  for (const url of urls.slice(0, 2)) {
    try {
      const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(Math.min(2000, timeoutMs)),
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: contract, data: "0x95d89b41" }, "latest"] }) });
      if (!r.ok) continue;
      const sym = abiText(((await r.json()) as { result?: unknown }).result);
      if (sym) return sym;
    } catch {
      // The next endpoint, or no symbol.
    }
  }
  return null;
}

/**
 * Any ERC-20's balance for a wallet: balanceOf and decimals() read with eth_call at the latest block, and the
 * contract's own symbol(). A contract that does not answer balanceOf or decimals() gives no figure.
 */
export async function erc20Balance(urls: readonly string[], contract: string, wallet: string, timeoutMs: number, symbolHint: string | null): Promise<TokenBalance> {
  const call = (data: string): Promise<bigint | null> => walletQuantity(urls, "eth_call", [{ to: contract, data }, "latest"], timeoutMs, true);
  const [raw, decimals, symbol] = await Promise.all([
    call(`0x70a08231${wallet.slice(2).toLowerCase().padStart(64, "0")}`), call("0x313ce567"), callSymbol(urls, contract, timeoutMs),
  ]);
  const label = symbol ?? symbolHint ?? "tokens";
  if (raw === null || decimals === null || decimals > 77n) return { symbol: label, contract, amount: null, error: "token_unreadable" };
  return { symbol: label, contract, amount: wholeUnits(raw, Number(decimals)) };
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
