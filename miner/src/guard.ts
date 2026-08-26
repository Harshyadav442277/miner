import { lookup } from "node:dns/promises";

/**
 * Refuses to open connections to addresses that aren't on the public internet.
 *
 * /ssl-check takes an arbitrary hostname from an untrusted caller and opens a
 * TCP connection to it. Without this, the miner is a server-side request forgery
 * primitive: anyone can ask it to probe private ranges, localhost, or a cloud
 * metadata endpoint and infer what's reachable from our response and timing.
 *
 * The check happens after DNS resolution, because a public name can resolve to a
 * private address — blocking the literal "127.0.0.1" while allowing a hostname
 * with an A record pointing there would be no protection at all.
 */

export type GuardResult = { allowed: true; address: string } | { allowed: false; reason: string };

function isBlockedIpv4(ip: string): string | null {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return "malformed address";
  const [a, b] = p as [number, number, number, number];
  if (a === 0) return "unspecified range";
  if (a === 10) return "private range (10/8)";
  if (a === 127) return "loopback";
  if (a === 169 && b === 254) return "link-local / cloud metadata";
  if (a === 172 && b >= 16 && b <= 31) return "private range (172.16/12)";
  if (a === 192 && b === 168) return "private range (192.168/16)";
  if (a === 100 && b >= 64 && b <= 127) return "carrier-grade NAT";
  if (a === 192 && b === 0) return "IETF protocol assignments";
  if (a >= 224) return "multicast or reserved";
  return null;
}

function isBlockedIpv6(ip: string): string | null {
  const s = ip.toLowerCase().split("%")[0] ?? "";
  if (s === "::" || s === "::1") return "loopback or unspecified";
  if (s.startsWith("fe80")) return "link-local";
  if (/^f[cd]/.test(s)) return "unique local address";
  // IPv4-mapped (::ffff:10.0.0.1) must be checked as IPv4.
  const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return isBlockedIpv4(mapped[1]);
  return null;
}

/** Resolves the host and rejects it if the address isn't publicly routable. */
export async function assertPublicHost(host: string): Promise<GuardResult> {
  let address: string;
  let family: number;
  try {
    const r = await lookup(host);
    address = r.address;
    family = r.family;
  } catch (e) {
    return { allowed: false, reason: `DNS lookup failed: ${(e as NodeJS.ErrnoException).code ?? "unknown"}` };
  }
  const blocked = family === 6 ? isBlockedIpv6(address) : isBlockedIpv4(address);
  if (blocked) return { allowed: false, reason: `refuses to connect to ${blocked}` };
  return { allowed: true, address };
}
