import { createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { ExactEvmScheme, toClientEvmSigner } from "@x402/evm";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";

/**
 * Telegraph engine client.
 *
 * Every inference call is x402-gated: the first request comes back 402 with a
 * payment challenge, the client signs a USDC transfer on Base Sepolia, and retries.
 * `wrapFetchWithPayment` does that round trip for us.
 *
 * We deliberately use the AUTO-ROUTED endpoint (`/engine/v1/ask`) rather than
 * calling a miner by ID. Two reasons:
 *   1. It is the honest thing to build — a real client asks a question and lets
 *      the network decide who answers it.
 *   2. Requests are then classified into an intent by Telegraph's own router, which
 *      is what the hackathon's per-intent eligibility guardrail counts.
 * Being routed to a competitor is a fine outcome; the intent still gets the demand.
 */

const ENGINE = process.env.TELEGRAPH_NODE ?? "https://devnode.telegraphprotocol.com";
const BASE_SEPOLIA: `eip155:${string}` = "eip155:84532";

export interface AskResult {
  minerId: string | null;
  minerName: string | null;
  intent: string | null;
  result: unknown;
  costUsd: number | null;
  durationMs: number | null;
  signalHash: string | null;
  reasoning: string | null;
}

let cachedFetch: typeof globalThis.fetch | null = null;

/**
 * Builds the paying fetch. The private key is read from the environment and never
 * logged, stored, or sent anywhere but the x402 signer.
 */
function payingFetch(): typeof globalThis.fetch {
  if (cachedFetch) return cachedFetch;

  const pk = process.env.EVM_PRIVATE_KEY;
  if (!pk) {
    throw new Error(
      "EVM_PRIVATE_KEY is not set. CertWatch pays per call via x402 and cannot run without a funded Base Sepolia wallet. See app/README.md.",
    );
  }

  const account = privateKeyToAccount(pk as `0x${string}`);
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
  const signer = toClientEvmSigner(account, publicClient);

  const client = x402Client.fromConfig({
    schemes: [{ network: BASE_SEPOLIA, client: new ExactEvmScheme(signer) }],
  });

  const wrapped = wrapFetchWithPayment(globalThis.fetch, client);
  cachedFetch = wrapped;
  return wrapped;
}

/** Address the app pays from — surfaced in the dashboard so funding is visible. */
export function payerAddress(): string | null {
  const pk = process.env.EVM_PRIVATE_KEY;
  if (!pk) return null;
  try {
    return privateKeyToAccount(pk as `0x${string}`).address;
  } catch {
    return null;
  }
}

/**
 * Asks Telegraph a natural-language question and lets the router pick a miner.
 */
export async function ask(query: string, timeoutMs = 45_000): Promise<AskResult> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await payingFetch()(`${ENGINE}/engine/v1/ask`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
      signal: ac.signal,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`engine ${res.status}: ${text.slice(0, 300)}`);
    }

    const body = JSON.parse(text) as Record<string, unknown>;
    return {
      minerId: (body["miner_id"] as string) ?? null,
      minerName: (body["miner_name"] as string) ?? null,
      intent: (body["intent"] as string) ?? null,
      result: body["result"] ?? null,
      costUsd: typeof body["cost_usd"] === "number" ? (body["cost_usd"] as number) : null,
      durationMs: typeof body["duration_ms"] === "number" ? (body["duration_ms"] as number) : null,
      signalHash: (body["signal_hash"] as string) ?? null,
      reasoning: (body["reasoning"] as string) ?? null,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Phrased so Telegraph's router classifies it as SSL_VERIFICATION. The intent
 * description requires a hostname and a question about its TLS certificate.
 */
export function certQuery(domain: string): string {
  return `Is the SSL/TLS certificate for ${domain} currently valid, and when does it expire?`;
}
