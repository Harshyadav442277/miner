/**
 * CROSS_CHAIN_STATE_VERIFY — does a bridge message from one chain verify against another.
 *
 * Canonical scope: "whether a state root, Merkle-Patricia proof, block header or
 * bridge message from one chain verifies against another. Requires two named
 * chains and a specific proof, header or message."
 *
 * WHAT IS VERIFIED, AND HOW. LayerZero V2 messages, on seven EVM chains, by
 * reading both chains ourselves rather than trusting an indexer's status:
 *   1. LayerZero Scan (documented public API, /v1/openapi) locates the message by
 *      source or destination transaction hash or by GUID, and names both legs.
 *   2. The SOURCE receipt, from that chain's public RPC, must carry a `PacketSent`
 *      log from EndpointV2 whose encoded packet has the same nonce, source and
 *      destination endpoint ids, sender, receiver and GUID.
 *   3. The DESTINATION receipt must carry a `PacketDelivered` log from EndpointV2
 *      with the same source endpoint id, sender, nonce and receiver.
 * Both receipts are fetched concurrently. Topics and the endpoint address were
 * read off a real Arbitrum -> Base Stargate message on 2026-09-12 (source
 * 0x46b61721…, destination 0x71585f25…), not taken from memory.
 *
 * WHAT IS NOT VERIFIED, AND SAID EVERY TIME. No state root, Merkle-Patricia proof
 * or block header is checked cryptographically: that needs a light client per
 * chain pair and no keyless service offers it. A request for one is refused by
 * name rather than answered with the message check dressed up as a proof check.
 * A "nonce 4412 from arbitrum" with no transaction hash, GUID or OApp address
 * does not identify a message — nonces are per pathway — so it is asked for.
 */
import { readReceipt } from "./onchain";

const TIMEOUT_MS = Number(process.env.CROSSCHAIN_TIMEOUT_MS ?? 4_000);
const SCAN = "https://scan.layerzero-api.com/v1/messages";
const ENDPOINT_V2 = "0x1a44076050125825900e736c501f859c50fe728c";
const PACKET_SENT = "0x1ab700d4ced0c005b164c0f789fd09fcbb0156d4c2041b8a3bfbcd961cd1567f";
const PACKET_DELIVERED = "0x3cd5e48f9730b129dc7550f0fcea9c767b7be37837cd10e55eb35f734f4bca04";

/** LayerZero V2 endpoint ids to the chains onchain.ts reads. Each checked against Scan 2026-09-12. */
const EID: Record<number, string> = {
  30101: "ethereum", 30102: "bsc", 30106: "avalanche", 30109: "polygon", 30110: "arbitrum", 30111: "optimism", 30184: "base",
};

const CHAIN_WORDS: Array<[RegExp, string]> = [
  [/\bethereum\b|\bmainnet\b/i, "ethereum"], [/\bbase\b/i, "base"], [/\barbitrum\b/i, "arbitrum"],
  [/\boptimism\b/i, "optimism"], [/\bpolygon\b/i, "polygon"], [/\bbsc\b|\bbnb chain\b/i, "bsc"], [/\bavalanche\b/i, "avalanche"],
];

export type CrossChainVerdict = "verified" | "not_delivered" | "mismatch" | "not_found" | "unsupported" | "insufficient_input" | "unknown";

export interface CrossChainResult {
  verdict: CrossChainVerdict;
  confidence: number;
  reason: string;
  error?: string;
}

/** Chains named in the question, in order of mention. */
export function namedChains(text: string): string[] {
  const s = String(text ?? "");
  const hits = CHAIN_WORDS.map(([re, c]) => ({ c, i: s.search(re) })).filter((h) => h.i >= 0);
  return hits.sort((a, b) => a.i - b.i).map((h) => h.c);
}

/** 32-byte references: transaction hashes or GUIDs, which have the same shape. */
export function references(text: string): string[] {
  return [...new Set([...String(text ?? "").matchAll(/\b0x[a-fA-F0-9]{64}\b/g)].map((m) => m[0].toLowerCase()))].slice(0, 2);
}

/** A proof, root or header check was asked for — the part this module never claims. */
export function asksProof(text: string): boolean {
  return /\bstate\s*root\b|\bmerkle\b|\bpatricia\b|\bstorage\s+proof\b|\bblock\s+header\b|\bproof\b/i.test(String(text ?? ""));
}

export interface ScanMessage {
  guid: string;
  status?: { name?: string };
  pathway: { srcEid: number; dstEid: number; nonce: number; sender: { address: string; name?: string }; receiver: { address: string } };
  source: { tx?: { txHash?: string } };
  destination: { status?: string; tx?: { txHash?: string } };
}

const word = (hex: string, i: number): string => hex.slice(i * 64, (i + 1) * 64);
const addr = (h: string): string => `0x${h.slice(-40)}`.toLowerCase();

/** Decode PacketSent's encoded packet: version(1) nonce(8) srcEid(4) sender(32) dstEid(4) receiver(32) guid(32). */
export function decodePacketSent(data: string): { nonce: number; srcEid: number; sender: string; dstEid: number; receiver: string; guid: string } | null {
  const hex = String(data ?? "").replace(/^0x/, "");
  const p = hex.slice(4 * 64);
  if (p.length < 2 + 16 + 8 + 64 + 8 + 64 + 64) return null;
  let o = 2;
  const take = (n: number): string => { const v = p.slice(o, o + n); o += n; return v; };
  const nonce = Number.parseInt(take(16), 16);
  const srcEid = Number.parseInt(take(8), 16);
  const sender = addr(take(64));
  const dstEid = Number.parseInt(take(8), 16);
  const receiver = addr(take(64));
  return { nonce, srcEid, sender, dstEid, receiver, guid: `0x${take(64)}` };
}

/** Decode PacketDelivered: (uint32 srcEid, bytes32 sender, uint64 nonce) origin, address receiver. */
export function decodePacketDelivered(data: string): { srcEid: number; sender: string; nonce: number; receiver: string } | null {
  const hex = String(data ?? "").replace(/^0x/, "");
  if (hex.length < 4 * 64) return null;
  return { srcEid: Number.parseInt(word(hex, 0), 16), sender: addr(word(hex, 1)), nonce: Number.parseInt(word(hex, 2), 16), receiver: addr(word(hex, 3)) };
}

async function scan(kind: "tx" | "guid", ref: string): Promise<ScanMessage[] | null | undefined> {
  try {
    const r = await fetch(`${SCAN}/${kind}/${ref}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (r.status === 404) return null;
    if (!r.ok) return undefined;
    const j = (await r.json()) as { data?: ScanMessage[] };
    return j.data?.length ? j.data : null;
  } catch {
    return undefined;
  }
}

const logsFrom = (logs: Array<{ address: string; topics: string[]; data: string }>, topic: string): string[] =>
  logs.filter((l) => l.address.toLowerCase() === ENDPOINT_V2 && l.topics?.[0] === topic).map((l) => l.data);

export async function verifyCrossChain(question: string): Promise<CrossChainResult> {
  const q = String(question ?? "");
  const refs = references(q);
  const proofNote = asksProof(q)
    ? " No state root, Merkle-Patricia proof or block header was verified cryptographically; only the message's emission and delivery receipts on both chains were checked." : "";
  if (!refs.length) {
    return { verdict: "insufficient_input", confidence: 0, error: "no_reference",
      reason: asksProof(q)
        ? "Nothing verifiable was supplied: this service does not verify state roots, Merkle-Patricia proofs or block headers, and no LayerZero message transaction hash or GUID was given. Supply a source or destination transaction hash to verify a bridge message across two chains."
        : "No bridge message was identified: a cross-chain check needs the message's source or destination transaction hash or its GUID. A nonce alone does not identify a message, because nonces are counted per sender-receiver pathway." };
  }
  const lookups = await Promise.all(refs.flatMap((r) => [scan("tx", r), scan("guid", r)]));
  const messages = lookups.find((m): m is ScanMessage[] => Array.isArray(m));
  if (!messages) {
    if (lookups.some((m) => m === undefined)) {
      return { verdict: "unknown", confidence: 0, error: "upstream_unavailable",
        reason: `The message for ${refs[0]} could not be located because LayerZero Scan did not respond. This is an availability problem, not a statement that the message does not exist.` };
    }
    return { verdict: "not_found", confidence: 0.6,
      reason: `No LayerZero message is indexed for ${refs.join(" or ")}, as a transaction hash or a GUID. Other bridges, such as Wormhole or native rollup bridges, are not checked here.${proofNote}` };
  }
  const nonceAsked = Number(q.match(/\bnonce\s*#?\s*(\d+)/i)?.[1] ?? Number.NaN);
  const m = messages.find((x) => x.pathway.nonce === nonceAsked) ?? messages[0]!;
  const src = EID[m.pathway.srcEid];
  const dst = EID[m.pathway.dstEid];
  const route = `${src ?? `endpoint ${m.pathway.srcEid}`} to ${dst ?? `endpoint ${m.pathway.dstEid}`}`;
  const id = `LayerZero message ${m.guid} (nonce ${m.pathway.nonce}, ${route})`;
  const asked = namedChains(q);
  if (asked.length >= 2 && src && dst && (asked[0] !== src || asked[1] !== dst) && !(asked.includes(src) && asked.includes(dst))) {
    return { verdict: "mismatch", confidence: 0.9,
      reason: `${id} does not travel between ${asked[0]} and ${asked[1]} as asked: it was sent from ${src} to ${dst}.${proofNote}` };
  }
  if (Number.isFinite(nonceAsked) && m.pathway.nonce !== nonceAsked) {
    return { verdict: "mismatch", confidence: 0.9, reason: `${id} carries nonce ${m.pathway.nonce}, not the nonce ${nonceAsked} named in the question.${proofNote}` };
  }
  if (!src || !dst) {
    return { verdict: "unsupported", confidence: 0.3,
      reason: `${id} involves a chain whose RPC is not read here, so its delivery was not verified on-chain. LayerZero Scan reports its status as ${m.status?.name ?? "unreported"}.${proofNote}` };
  }
  const srcHash = m.source.tx?.txHash ?? "";
  const dstHash = m.destination.tx?.txHash ?? "";
  const [srcRc, dstRc] = await Promise.all([
    readReceipt(src, srcHash),
    dstHash ? readReceipt(dst, dstHash) : Promise.resolve(null),
  ]);
  if (srcRc === undefined || (dstHash && dstRc === undefined)) {
    return { verdict: "unknown", confidence: 0, error: "rpc_unavailable",
      reason: `${id} could not be verified on-chain because the ${srcRc === undefined ? src : dst} RPC endpoints did not respond. Nothing is concluded about the message.${proofNote}` };
  }
  const sent = (srcRc?.logs ? logsFrom(srcRc.logs, PACKET_SENT) : []).map(decodePacketSent)
    .find((p) => p && p.nonce === m.pathway.nonce && p.guid === m.guid.toLowerCase() && p.srcEid === m.pathway.srcEid
      && p.dstEid === m.pathway.dstEid && p.sender === m.pathway.sender.address.toLowerCase() && p.receiver === m.pathway.receiver.address.toLowerCase());
  if (!srcRc || srcRc.status !== "0x1" || !sent) {
    return { verdict: "mismatch", confidence: 0.8,
      reason: `${id} is not confirmed at its source: the ${src} transaction ${srcHash} ${srcRc ? "carries no matching PacketSent event from the LayerZero endpoint" : "was not found on-chain"}.${proofNote}` };
  }
  if (!dstHash || !dstRc) {
    return { verdict: "not_delivered", confidence: 0.8,
      reason: `${id} was sent on ${src} in transaction ${srcHash}, verified on-chain, but has not been executed on ${dst}: no destination transaction exists yet (Scan status ${m.status?.name ?? "unreported"}).${proofNote}` };
  }
  const delivered = logsFrom(dstRc.logs, PACKET_DELIVERED).map(decodePacketDelivered)
    .some((d) => d && d.srcEid === m.pathway.srcEid && d.nonce === m.pathway.nonce
      && d.sender === m.pathway.sender.address.toLowerCase() && d.receiver === m.pathway.receiver.address.toLowerCase());
  if (dstRc.status !== "0x1" || !delivered) {
    return { verdict: "mismatch", confidence: 0.8,
      reason: `${id} does not verify on ${dst}: destination transaction ${dstHash} ${dstRc.status !== "0x1" ? "reverted" : "carries no matching PacketDelivered event"}, although Scan reports ${m.status?.name ?? "a status"}.${proofNote}` };
  }
  return { verdict: "verified", confidence: 0.95,
    reason: `Verified: ${id} was emitted on ${src} in ${srcHash} and delivered on ${dst} in ${dstHash}. Both receipts succeeded and their endpoint events agree on nonce, sender, receiver and GUID.${proofNote}` };
}
