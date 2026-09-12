/**
 * FRAUD_DETECTION — how likely a named entity, transaction or action is to be
 * fraudulent, answered from signals we actually check.
 *
 * The canonical description covers two very different questions:
 *
 *   "How likely is it that this transaction from 0xabc123... is fraudulent?"
 *   "Does this email asking me to wire money to a new account look like a scam?"
 *
 * The first is an on-chain subject; the second is a piece of text. Both are
 * answered here, and in both cases the answer names the evidence it used.
 *
 * THE RULE THIS FILE IS BUILT AROUND: **absence of evidence is not evidence of
 * safety.** A wallet that is not on a sanctions list is not thereby honest, and
 * a domain a threat feed has not flagged is not thereby trustworthy. So a clean
 * result is reported as "no indicators were found among the checks performed",
 * with the checks named, rather than as "this is safe". Saying "safe" about
 * something we merely failed to find dirt on is the failure mode that matters
 * here — it is the answer a person would act on.
 *
 * THE SIGNALS, all keyless and all verified 2026-09-10:
 *
 *   sanctions   OFAC's sanctioned digital-currency addresses. A hit is
 *               definitive and dominates every other signal.
 *   reputation  Cloudflare's security resolver returns 0.0.0.0 for domains its
 *               threat intelligence classes as malware or phishing, where its
 *               open resolver returns the real address. Comparing the two is a
 *               real reputation lookup rather than a guess about the name.
 *   on-chain    Whether an address is a contract or an account, its nonce and
 *               its balance — a zero-activity address being asked to receive a
 *               wire is a materially different thing from an established one.
 *   language    Scam markers that are specific rather than atmospheric: a
 *               request for a seed phrase or private key, gift-card payment, a
 *               changed bank account, and manufactured urgency.
 *
 * What is NOT claimed: this does not detect novel fraud, read transaction graphs
 * or judge intent. Those need data and models we do not have, and the answer
 * says which checks were run so the caller can see the boundary.
 */

import { asksPaperFraud, assessPaperFraud } from "./paperfraud";

const TIMEOUT_MS = Number(process.env.FRAUD_TIMEOUT_MS ?? 4_000);
const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";

/**
 * OFAC's sanctioned digital-currency addresses, as published by the US Treasury
 * and mirrored in machine-readable form. The mirror is named in the answer
 * rather than presented as Treasury itself, because it is a mirror.
 */
const OFAC_LISTS = [
  "https://raw.githubusercontent.com/0xB10C/ofac-sanctioned-digital-currency-addresses/lists/sanctioned_addresses_ETH.txt",
];
const DNS_SECURE = "https://security.cloudflare-dns.com/dns-query";
const DNS_OPEN = "https://cloudflare-dns.com/dns-query";
const RPC = "https://ethereum-rpc.publicnode.com";

export type FraudVerdict = "high_risk" | "elevated_risk" | "no_indicators" | "unknown";

export interface FraudResult {
  subject: string | null;
  verdict: FraudVerdict;
  confidence: number;
  reason: string;
  error?: string;
}

/** Scam markers chosen to be specific: each one is a thing a legitimate message does not ask for. */
const MARKERS: Array<[RegExp, string]> = [
  // Plurals matter: `\bgift card\b` cannot match "gift cards", because the `s`
  // is a word character so there is no boundary after "card". Every marker here
  // that names a countable thing takes an optional `s`.
  [/\b(seed phrases?|recovery phrases?|private keys?|mnemonics?)\b/i, "asks for a seed phrase or private key, which no legitimate service ever needs"],
  [/\b(gift|itunes|steam|google play)\s+cards?\b/i, "requests payment in gift cards, which is not a recoverable payment method"],
  [/\b(new|updated|changed)\s+(bank|account|wire|routing|payment)\s*(details|account|information|instructions)?\b/i, "asks to send money to changed banking details, the standard business-email-compromise pattern"],
  [/\b(wire|transfer|send)\b[^.]{0,40}\b(urgently|immediately|today|right away|asap)\b/i, "combines a payment request with manufactured urgency"],
  [/\b(verify|confirm|validate)\s+your\s+(account|wallet|identity|password)\b/i, "asks you to verify credentials through the message itself, which is how phishing harvests them"],
  [/\b(guaranteed|risk[- ]free)\b[^.]{0,30}\b(returns?|profits?|roi)\b/i, "promises guaranteed returns, which no real investment offers"],
  [/\b(double|triple|10x)\s+your\s+(crypto|bitcoin|eth|money|investment)\b/i, "offers to multiply funds sent to it, the classic giveaway scam"],
  [/\b(suspended|locked|frozen)\b[^.]{0,40}\b(click|verify|login|log in)\b/i, "claims an account problem and pushes a link, the standard phishing frame"],
];

export function evmAddress(text: string): string | null {
  return String(text ?? "").match(/\b0x[a-fA-F0-9]{40}\b/)?.[0]?.toLowerCase() ?? null;
}

export function txHash(text: string): string | null {
  return String(text ?? "").match(/\b0x[a-fA-F0-9]{64}\b/)?.[0]?.toLowerCase() ?? null;
}

/** A hostname in the text, ignoring the ones that are merely where a message came from. */
export function hostnames(text: string): string[] {
  const s = String(text ?? "");
  const out = new Set<string>();
  for (const m of s.matchAll(/\bhttps?:\/\/([^\s/:?#]+)/gi)) if (m[1]) out.add(m[1].toLowerCase());
  for (const m of s.matchAll(/\b([a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+)\b/gi)) {
    const h = (m[1] ?? "").toLowerCase();
    // A bare word with a dot is only a hostname if it ends in a plausible TLD.
    if (/\.(com|net|org|io|co|xyz|info|biz|ru|cn|top|live|app|dev|me|link|click|site|online|shop)$/.test(h)) out.add(h);
  }
  return [...out].slice(0, 3);
}

export function scamMarkers(text: string): string[] {
  return MARKERS.filter(([re]) => re.test(String(text ?? ""))).map(([, label]) => label);
}

async function getText(url: string): Promise<string> {
  const r = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

/** Is this address on the OFAC sanctions list? `null` means the list could not be read. */
export async function sanctioned(address: string): Promise<boolean | null> {
  for (const url of OFAC_LISTS) {
    try {
      const body = await getText(url);
      const set = new Set(body.split(/\r?\n/).map((l) => l.trim().toLowerCase()).filter(Boolean));
      return set.has(address.toLowerCase());
    } catch { /* try the next list */ }
  }
  return null;
}

async function dnsA(base: string, host: string): Promise<string[] | null> {
  try {
    const r = await fetch(`${base}?name=${encodeURIComponent(host)}&type=A`, {
      headers: { accept: "application/dns-json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { Answer?: Array<{ type: number; data: string }> };
    return (j.Answer ?? []).filter((a) => a.type === 1).map((a) => a.data);
  } catch {
    return null;
  }
}

/**
 * Whether a threat feed classes this host as malware or phishing.
 *
 * Cloudflare's security resolver answers 0.0.0.0 for a blocked host while its
 * open resolver answers the real address. Comparing the two is what makes this
 * a reputation lookup rather than an opinion about the domain name. `null` means
 * the check could not be completed, which is different from a clean result.
 */
export async function flaggedByThreatFeed(host: string): Promise<boolean | null> {
  const [secure, open] = await Promise.all([dnsA(DNS_SECURE, host), dnsA(DNS_OPEN, host)]);
  if (secure === null || open === null) return null;
  if (open.length === 0) return null;               // does not resolve at all; nothing to compare
  return secure.length > 0 && secure.every((ip) => ip === "0.0.0.0");
}

type AccountKind = "contract" | "account" | "delegated account";

interface ChainFacts { kind: AccountKind; nonce: number; balanceEth: number }

/**
 * What the code at an address actually means.
 *
 * `eth_getCode` returning something non-empty does NOT make an address a
 * contract any more. Under EIP-7702 an externally owned account can carry a
 * 23-byte delegation designator, `0xef0100` followed by the address it delegates
 * to, and it remains an EOA controlled by its key. Reading that as "a contract"
 * is simply wrong, and it was: the first address tested here, vitalik.eth,
 * returns `0xef01005a7fc11397e9a8ad41bf10bf13f22b0a63f96f6d` and was being
 * described as a contract.
 *
 * The distinction matters for this intent: "a contract" and "an account with a
 * smart-account delegation" are different claims about who controls the funds.
 */
export function accountKind(code: string): AccountKind {
  const c = String(code ?? "").toLowerCase();
  if (c === "0x" || c.length <= 2) return "account";
  if (/^0xef0100[0-9a-f]{40}$/.test(c)) return "delegated account";
  return "contract";
}

async function chainFacts(address: string): Promise<ChainFacts | null> {
  const call = async (method: string, params: unknown[]): Promise<string | null> => {
    try {
      const r = await fetch(RPC, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!r.ok) return null;
      const j = (await r.json()) as { result?: string };
      return typeof j.result === "string" ? j.result : null;
    } catch {
      return null;
    }
  };
  const [code, nonce, balance] = await Promise.all([
    call("eth_getCode", [address, "latest"]),
    call("eth_getTransactionCount", [address, "latest"]),
    call("eth_getBalance", [address, "latest"]),
  ]);
  if (code === null || nonce === null || balance === null) return null;
  return {
    kind: accountKind(code),
    nonce: Number(BigInt(nonce)),
    balanceEth: Number(BigInt(balance)) / 1e18,
  };
}

export async function assessFraud(text: string): Promise<FraudResult> {
  const address = evmAddress(text);
  const hash = txHash(text);
  const hosts = hostnames(text);
  const markers = scamMarkers(text);
  const subject = address ?? hash ?? hosts[0] ?? null;

  if (!address && !hash && hosts.length === 0 && markers.length === 0) {
    /**
     * Before the refusal: is this a fraud question about a PAPER?
     *
     * Five of the twenty-nine routed questions for this intent ask whether a
     * named publication is retracted or the product of a paper mill. They carry
     * no address, no hash and no domain, so every one of them landed on the
     * refusal below — which tells a caller who supplied a perfectly good subject
     * that they supplied none.
     */
    if (asksPaperFraud(text)) {
      const p = await assessPaperFraud(text);
      return {
        subject: p.matched ?? p.title,
        verdict: p.verdict,
        confidence: p.confidence,
        reason: p.reason,
      };
    }
    return {
      subject: null, verdict: "unknown", confidence: 0,
      reason:
        "No wallet address, transaction hash, domain or message text was supplied, so there is " +
        "nothing to assess for fraud. Supply the address, the link, or the message itself and it " +
        "can be checked against sanctions listings, threat-intelligence feeds and known scam patterns.",
      error: "no_subject",
    };
  }

  const evidence: string[] = [];
  const notChecked: string[] = [];
  let high = false;
  let elevated = false;

  if (address) {
    const hit = await sanctioned(address);
    if (hit === null) notChecked.push("the OFAC sanctions listing could not be read");
    else if (hit) {
      high = true;
      evidence.push(`the address ${address} appears on the OFAC sanctioned digital-currency address list`);
    } else {
      evidence.push(`the address ${address} is not on the OFAC sanctioned digital-currency address list`);
    }

    const facts = await chainFacts(address);
    if (!facts) notChecked.push("the address's on-chain history could not be read");
    else {
      evidence.push(
        `on chain it is ${facts.kind === "contract" ? "a contract" : facts.kind === "delegated account" ? "an externally owned account with an EIP-7702 smart-account delegation" : "an externally owned account"} with ` +
        `${facts.nonce.toLocaleString("en-US")} outgoing transaction${facts.nonce === 1 ? "" : "s"} ` +
        `and a balance of ${facts.balanceEth.toFixed(4)} ETH`,
      );
      // A brand-new, empty account being pointed at money is the shape of a
      // throwaway address, though it is equally the shape of a new user.
      if (facts.nonce === 0 && facts.balanceEth === 0 && facts.kind !== "contract") {
        elevated = true;
        evidence.push("it has never sent a transaction and holds no balance, which is consistent with a newly created throwaway address");
      }
    }
  }

  for (const host of hosts) {
    const flagged = await flaggedByThreatFeed(host);
    if (flagged === null) notChecked.push(`${host} could not be checked against the threat-intelligence feed`);
    else if (flagged) {
      high = true;
      evidence.push(`${host} is blocked as malware or phishing by Cloudflare's threat-intelligence resolver`);
    } else {
      evidence.push(`${host} is not flagged as malware or phishing by Cloudflare's threat-intelligence resolver`);
    }
  }

  if (markers.length) {
    elevated = true;
    evidence.push(`the message ${markers.join("; it ")}`);
  }

  const verdict: FraudVerdict = high ? "high_risk" : elevated ? "elevated_risk" : "no_indicators";
  const gap = notChecked.length ? ` Not checked: ${notChecked.join("; ")}.` : "";

  const lead = high
    ? "This is high risk."
    : elevated
      ? "This shows elevated risk indicators."
      : "No fraud indicators were found among the checks performed.";

  // The clean case is the one worth being careful about: it must not read as a
  // clearance. A caller acts on this sentence.
  const caveat = high || elevated
    ? ""
    : " That is not the same as being safe: these checks detect known-bad addresses, flagged domains " +
      "and common scam wording, and fraud that is none of those would not appear here.";

  return {
    subject, verdict, confidence: high ? 0.95 : elevated ? 0.7 : 0.5,
    reason: `${lead} Assessed on the following: ${evidence.join("; ")}.${gap}${caveat}`,
  };
}
