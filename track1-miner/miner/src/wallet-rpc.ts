/** Bounded, read-only RPC retries. One stalled provider must not hide a healthy alternate. */
export async function walletQuantity(
  urls: readonly string[], method: "eth_getBalance" | "eth_call", params: unknown[],
  timeoutMs: number, abiWord = false,
): Promise<bigint | null> {
  const deadline = new AbortController();
  const budget = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 6000;
  const timer = setTimeout(() => deadline.abort(), budget);
  let next = 0;
  async function worker(): Promise<bigint> {
    while (!deadline.signal.aborted && next < urls.length) {
      const url = urls[next++]!;
      const attempt = new AbortController();
      const attemptTimer = setTimeout(() => attempt.abort(), Math.min(2000, budget));
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          signal: AbortSignal.any([deadline.signal, attempt.signal]),
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        });
        if (!response.ok) continue;
        const body = await response.json() as { result?: unknown; error?: unknown };
        const valid = abiWord ? /^0x[\da-f]{64}$/i : /^0x(?:0|[1-9a-f][\da-f]{0,63})$/i;
        if (body.error != null || typeof body.result !== "string" || !valid.test(body.result)) continue;
        return BigInt(body.result);
      } catch {
        // The other worker may already have the answer; otherwise try the next spare.
      } finally {
        clearTimeout(attemptTimer);
      }
    }
    throw new Error("No usable wallet RPC response");
  }
  try {
    return await Promise.any(Array.from({ length: Math.min(2, urls.length) }, () => worker()));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    deadline.abort();
  }
}
