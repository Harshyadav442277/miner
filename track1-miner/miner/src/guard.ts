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
  const groups = parseIpv6(s);
  if (!groups) return "malformed address";
  if (groups.every((n) => n === 0) || groups.slice(0, 7).every((n) => n === 0) && groups[7] === 1) {
    return "loopback or unspecified";
  }
  if ((groups[0]! & 0xffc0) === 0xfe80) return "link-local";
  if ((groups[0]! & 0xfe00) === 0xfc00) return "unique local address";
  if ((groups[0]! & 0xff00) === 0xff00) return "multicast";
  if (groups[0] === 0x2001 && groups[1] === 0x0db8) return "documentation range";
  // Both dotted and hexadecimal IPv4-mapped forms must inherit IPv4 rules.
  if (groups.slice(0, 5).every((n) => n === 0) && groups[5] === 0xffff) {
    return isBlockedIpv4(`${groups[6]! >> 8}.${groups[6]! & 255}.${groups[7]! >> 8}.${groups[7]! & 255}`);
  }
  return null;
}

function parseIpv6(ip: string): number[] | null {
  let source = ip;
  const dotted = source.match(/(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (dotted) {
    const p = dotted.split(".").map(Number);
    if (p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    source = source.slice(0, -dotted.length) + `${((p[0]! << 8) | p[1]!).toString(16)}:${((p[2]! << 8) | p[3]!).toString(16)}`;
  }
  const halves = source.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;
  const raw = [...left, ...Array(missing).fill("0"), ...right];
  if (raw.length !== 8 || raw.some((x) => !/^[0-9a-f]{1,4}$/.test(x))) return null;
  return raw.map((x) => Number.parseInt(x, 16));
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
