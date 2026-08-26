import * as tls from "node:tls";
import { checkServerIdentity } from "node:tls";
import { extractHostname } from "./extract";
import { assertPublicHost } from "./guard";

/**
 * A live TLS handshake against the host, reporting what the server is actually
 * serving right now.
 *
 * This is deliberately not a certificate-transparency lookup. CT logs report what
 * was *issued* for a domain; they cannot tell you what the server has *deployed*.
 * A host serving an expired cert while a fresh one sits unissued in CT is exactly
 * the case SSL_VERIFICATION is asked about, and only a handshake sees it.
 */

export type Verdict =
  | "valid"
  | "expired"
  | "not_yet_valid"
  | "hostname_mismatch"
  | "self_signed"
  | "untrusted"
  | "unreachable";

export interface SslResult {
  domain: string;
  verdict: Verdict;
  valid: boolean;
  trusted: boolean;
  expired: boolean;
  hostname_match: boolean;
  issuer: string | null;
  subject: string | null;
  valid_from: string | null;
  valid_to: string | null;
  days_remaining: number | null;
  tls_protocol: string | null;
  confidence: number;
  reason: string;
  checked_at: string;
}

const DEFAULT_TIMEOUT_MS = 8000;

/** Accepts "example.com", "https://example.com/path", "example.com:8443". */
export function normalizeTarget(raw: string): { host: string; port: number } | null {
  let s = (raw ?? "").trim();
  if (!s) return null;
  if (s.includes("://")) {
    try {
      const u = new URL(s);
      s = u.hostname + (u.port ? `:${u.port}` : "");
    } catch {
      // A sentence that merely *contains* a URL is not itself a URL. Fall
      // through to extraction rather than giving up here.
      const inner = extractHostname(raw);
      if (inner) {
        s = inner;
      } else {
        return null;
      }
    }
  }
  s = s.replace(/^\/+|\/+$/g, "").split("/")[0] ?? "";
  let port = 443;
  const m = s.match(/^(.*):(\d+)$/);
  if (m && m[1] && m[2]) {
    s = m[1];
    port = Number(m[2]);
  }
  s = s.toLowerCase();
  // Hostname sanity: labels of alphanumerics/hyphens, or a bare IPv4.
  const isHost = /^(?=.{1,253}$)([a-z0-9](-?[a-z0-9])*)(\.[a-z0-9](-?[a-z0-9])*)+$/.test(s);
  const isIpv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(s);
  if (!isHost && !isIpv4) {
    // The caller may have handed us a whole sentence. Rather than 400 on a
    // question we can obviously answer, find the hostname inside it.
    const found = extractHostname(raw);
    if (found && found !== s) {
      const retry = normalizeTarget(found);
      if (retry) return retry;
    }
    return null;
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return { host: s, port };
}

function parseCertDate(v: string | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function orgOf(name: Record<string, unknown> | undefined): string | null {
  if (!name) return null;
  const o = (name["O"] ?? name["CN"] ?? null) as string | null;
  return typeof o === "string" && o.length > 0 ? o : null;
}

function unreachable(domain: string, why: string): SslResult {
  return {
    domain,
    verdict: "unreachable",
    valid: false,
    trusted: false,
    expired: false,
    hostname_match: false,
    issuer: null,
    subject: null,
    valid_from: null,
    valid_to: null,
    days_remaining: null,
    tls_protocol: null,
    confidence: 1,
    reason: `No TLS certificate could be retrieved for ${domain}: ${why}.`,
    checked_at: new Date().toISOString(),
  };
}

export async function checkCertificate(
  host: string,
  port = 443,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<SslResult> {
  // Never open a socket to a non-public address — see guard.ts.
  const guard = await assertPublicHost(host);
  if (!guard.allowed) return unreachable(host, guard.reason);

  return new Promise((resolve) => {
    let settled = false;
    const done = (r: SslResult): void => {
      if (!settled) {
        settled = true;
        resolve(r);
      }
    };

    const socket = tls.connect(
      {
        host,
        port,
        servername: host,
        // Report on bad certificates instead of refusing to talk about them.
        rejectUnauthorized: false,
        ALPNProtocols: ["http/1.1"],
      },
      () => {
        try {
          done(evaluate(host, socket));
        } catch (e) {
          done(unreachable(host, (e as Error).message));
        } finally {
          socket.end();
        }
      },
    );

    socket.setTimeout(timeoutMs, () => {
      done(unreachable(host, `handshake timed out after ${timeoutMs}ms`));
      socket.destroy();
    });
    socket.on("error", (e: NodeJS.ErrnoException) => {
      done(unreachable(host, e.code ?? e.message));
    });
  });
}

function evaluate(host: string, socket: tls.TLSSocket): SslResult {
  const cert = socket.getPeerCertificate(false);
  if (!cert || Object.keys(cert).length === 0) {
    return unreachable(host, "server presented no certificate");
  }

  const now = new Date();
  const from = parseCertDate(cert.valid_from);
  const to = parseCertDate(cert.valid_to);

  const notYetValid = from !== null && now < from;
  const expired = to !== null && now > to;
  const identityErr = checkServerIdentity(host, cert);
  const hostnameMatch = identityErr === undefined;

  const authError = socket.authorizationError as string | Error | undefined;
  const authCode = typeof authError === "string" ? authError : authError?.message ?? null;
  // Only the leaf being self-signed is "self_signed". A self-signed *root* in the
  // chain means the anchor isn't in the trust store — that is an untrusted chain,
  // a different fact about a different certificate.
  const selfSigned = authCode === "DEPTH_ZERO_SELF_SIGNED_CERT";
  const trusted = socket.authorized === true;

  const daysRemaining =
    to === null ? null : Math.floor((to.getTime() - now.getTime()) / 86_400_000);

  // Most specific failure first — an expired cert is more useful to report than
  // the generic "untrusted" that expiry also produces.
  let verdict: Verdict;
  if (expired) verdict = "expired";
  else if (notYetValid) verdict = "not_yet_valid";
  else if (selfSigned) verdict = "self_signed";
  else if (!hostnameMatch) verdict = "hostname_mismatch";
  else if (!trusted) verdict = "untrusted";
  else verdict = "valid";

  const issuer = orgOf(cert.issuer as unknown as Record<string, unknown>);
  const subject = ((cert.subject as unknown as Record<string, unknown>)?.["CN"] as string) ?? host;
  const validTo = to ? to.toISOString().slice(0, 10) : null;

  return {
    domain: host,
    verdict,
    valid: verdict === "valid",
    trusted,
    expired,
    hostname_match: hostnameMatch,
    issuer,
    subject,
    valid_from: from ? from.toISOString().slice(0, 10) : null,
    valid_to: validTo,
    days_remaining: daysRemaining,
    tls_protocol: socket.getProtocol(),
    confidence: 1,
    reason: describe(host, verdict, issuer, validTo, daysRemaining, authCode),
    checked_at: now.toISOString(),
  };
}

/**
 * One factual sentence. Kept tight on purpose: scoring compares the miner's
 * answer text against a ground-truth text, and padding an answer with words the
 * ground truth does not contain dilutes the overlap.
 */
function describe(
  host: string,
  verdict: Verdict,
  issuer: string | null,
  validTo: string | null,
  days: number | null,
  authCode: string | null,
): string {
  const by = issuer ? ` issued by ${issuer}` : "";
  const until = validTo ? `, expires ${validTo}` : "";
  const left = days !== null ? ` (${days} days remaining)` : "";
  switch (verdict) {
    case "valid":
      return `The SSL certificate for ${host} is valid and trusted${by}${until}${left}.`;
    case "expired":
      return `The SSL certificate for ${host} is expired${by}, it expired on ${validTo}.`;
    case "not_yet_valid":
      return `The SSL certificate for ${host} is not yet valid${by}.`;
    case "self_signed":
      return `The SSL certificate for ${host} is self-signed and not trusted${until}.`;
    case "hostname_mismatch":
      return `The SSL certificate for ${host} is not valid for that hostname${by}${until}.`;
    case "untrusted":
      return `The SSL certificate for ${host} is not trusted${by}${until}${authCode ? ` (${authCode})` : ""}.`;
    default:
      return `No SSL certificate could be retrieved for ${host}.`;
  }
}
