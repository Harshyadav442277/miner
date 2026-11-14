/**
 * CHAT_COMPLETION, CODE_REVIEW, SMART_CONTRACT_AUDIT and TEXT_GENERATION — answers a language model writes, through llm.ts (Groq).
 *
 * Each intent's own schema (GET /engine/v1/intents/<id>, read 2026-11-07) names the request field and the
 * scored one:
 *   CHAT_COMPLETION  message → reply, verdict (Likely | Unlikely | Uncertain, for "will X happen"),
 *                    brief (one plain sentence of at most 80 characters; the scored field)
 *   CODE_REVIEW      code    → verdict (Approve | Request changes | Comment; scored), findings in severity
 *                    order, summary (one or two sentences)
 *   TEXT_GENERATION  prompt  → text without preamble, title if it has one, brief (the text if at most 80
 *                    characters, else its opening sentence cut to 80; scored)
 *
 * The model returns JSON, and every field is checked here before it is served: an enum outside its set, an
 * empty reply or text, or a review whose verdict contradicts its own findings is corrected or refused. No
 * model answer is an honest `unknown`, never an invented one.
 */
import { phrase } from "./llm";
import { completeReview } from "./review-validation";

export interface GenAnswer { verdict?: string; confidence: number; reason: string; error?: string; [k: string]: unknown }

const SOURCE = "Groq (gpt-oss-120b, falling back to qwen3.8-27b and gpt-oss-20b)";
/** The model's own probability is not calibrated; this fixed value says so rather than inventing one. */
const CONFIDENCE = 0.8;
/** About 2K tokens: with the reply, one call stays well under one model's 8K tokens a minute. */
const MAX_INPUT = 8_000;

/** The first JSON object in a reply, or null. Pure. */
export function parseObject(raw: string): Record<string, unknown> | null {
  const s = String(raw ?? "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try {
    const v = JSON.parse(s.slice(a, b + 1)) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/**
 * At most `n` characters. A clause boundary at 60 characters or later reads as a sentence and ends with a full
 * stop; anything shorter is a truncated phrase, cut at a word and marked "…", never dressed as a sentence with
 * a "." (a 40-character clause gave "Recursion is like a set of Russian nesting dolls.", 2026-11-08). Pure.
 */
export function cut(text: string, n = 80): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  const head = t.slice(0, n - 1);
  const clause = Math.max(head.lastIndexOf(", "), head.lastIndexOf("; "), head.lastIndexOf(": "), head.lastIndexOf(" - "), head.lastIndexOf(" — "));
  const whole = clause >= 60;
  const at = whole ? clause : head.lastIndexOf(" ");
  let out = (at > 20 ? head.slice(0, at) : head).replace(/[,;:\s]+$/, "");
  while (DANGLING.test(out)) out = out.replace(DANGLING, "");
  return whole ? `${out}.` : `${out.replace(/[.,;:!?\s—-]+$/, "")}…`;
}

/** Words a cut sentence must not end on. */
const DANGLING = /\s+(?:a|an|the|of|to|in|on|at|by|for|with|from|into|and|or|but|that|which|is|are|was|were|be|as|its|their|this|these)$/i;

/** The opening sentence of `text`. Pure. */
export function opening(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? t;
}

function unavailable(what: string, extra: Record<string, unknown>): GenAnswer {
  return { ...extra, verdict: "unknown", confidence: 0, error: "upstream_unavailable", source: SOURCE,
    reason: `Unknown: the language model did not return ${what} in time, so nothing was generated. Retrying shortly should succeed.` };
}

function missing(what: string, field: string, extra: Record<string, unknown>): GenAnswer {
  return { ...extra, verdict: "insufficient_input", confidence: 0, error: `no_${field}`, source: SOURCE,
    reason: `No ${what} was supplied. Send it as the ${field} parameter or as the whole question.` };
}

function oversizedReview(what: string): GenAnswer {
  return { verdict: "insufficient_input", confidence: 0, error: "input_too_long", findings: [], summary: null, finding_count: null,
    reason: `The ${what} exceeds the ${MAX_INPUT}-character review limit. No code was reviewed. Send a smaller complete unit with its relevant dependencies.` };
}

/** A "will X happen" question, whose reply leads with Likely, Unlikely or Uncertain. Pure. */
export function asksWillHappen(message: string): boolean {
  return /^\s*(?:will|is it (?:likely|going)|are .{1,40} going to|is .{1,60} going to|could|might|what are the (?:odds|chances))\b/i.test(message);
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * The chat prompt for the day of `now`. Without today's date the model wrote "as of 2024" on 2026-11-14
 * (production). The date line also rotates phrase()'s system+user cache key each day. Pure.
 */
export function chatSystem(now: Date): string {
  const today = `${now.getUTCDate()} ${MONTHS[now.getUTCMonth()]} ${now.getUTCFullYear()}`;
  return `You answer one message from a user, correctly and directly. Reply with a JSON object:
{"brief": the answer in one plain sentence of at most 80 characters, "reply": the full answer in at most 150 words, starting with that sentence, "verdict": null}
For a question about whether something will happen, set "verdict" to "Likely", "Unlikely" or "Uncertain" and start both brief and reply with that word.
No markdown in brief. Never refer to yourself, your training or your last update.
Today is ${today} (UTC). Never state a different current year. When a fact may have changed since your information was written, say what was true and the year it dates from, without claiming it is still current.`;
}

const REPAIR_SYSTEM = "Rewrite the answer below as ONE complete plain sentence of at most 80 characters that directly answers the question. No preamble, no quotes, no ellipsis. For a forecast keep the leading verdict word and colon.";

const VERDICT_LEAD = /^(?:Likely|Unlikely|Uncertain):\s+/;
/** "While X, Y" asserts Y: the concession can go. "If X, Y" does not assert Y alone, so it is never dropped. */
const CONCESSION = /^(?:while|although|even though|though|whereas|despite)\b[^,]*,\s+/i;
const SUBORDINATE = /^(?:while|although|even though|though|whereas|despite|if|when|unless|because|since|as|after|before|once|until)\b/i;

/**
 * `sentence` in at most `n` characters as a complete clause ending with ".", never "…". A forecast keeps its
 * verdict word. The brief "Uncertain: While NASA's Artemis program and private initiatives aim for Mars…" was
 * served cut mid-sentence (production 2026-11-14). Pure.
 */
export function clauseBrief(sentence: string, n = 80): string {
  let t = sentence.replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  const lead = t.match(VERDICT_LEAD)?.[0] ?? "";
  let body = t.slice(lead.length);
  const concession = body.match(CONCESSION);
  if (concession) {
    const main = body.slice(concession[0].length);
    body = lead ? main : main.charAt(0).toUpperCase() + main.slice(1);
    t = lead + body;
    if (t.length <= n) return t;
  }
  const head = t.slice(0, n - 1);
  const words = (s: string): number => s.split(" ").filter(Boolean).length;
  // The last clause boundary that leaves four words; the verdict's own colon is not one, nor a cut that would
  // leave only an opening "If ..." or "Because ..." clause.
  for (let i = head.length - 2; i >= lead.length; i--) {
    if (![", ", "; ", ": ", " — ", " - "].some((s) => head.startsWith(s, i))) continue;
    const out = head.slice(0, i).replace(/[.,;:!?\s—-]+$/, "");
    if (words(out) < 4) break;
    if (SUBORDINATE.test(body) && !out.slice(lead.length).includes(",")) continue;
    return `${out}.`;
  }
  const at = head.lastIndexOf(" ");
  let out = (at > lead.length ? head.slice(0, at) : head).replace(/[.,;:!?\s—-]+$/, "");
  while (DANGLING.test(out)) out = out.replace(DANGLING, "").replace(/[.,;:!?\s—-]+$/, "");
  return `${out}.`;
}

/** Non-breaking (U+2011), plain Unicode (U+2010) and minus (U+2212) hyphens as "-". Pure. */
export const plainHyphens = (t: string): string => t.replace(/[‐‑−]/g, "-");

/**
 * Whether the model's brief says something: at least four words, and not just the verdict word. A forecast
 * brief of "Uncertain" alone was served as the scored field (comparison with the top miners, 2026-11-08). Pure.
 */
export function usableBrief(brief: string, verdict: string | null): boolean {
  if (brief.split(/\s+/).filter(Boolean).length < 4) return false;
  const bare = brief.replace(/[^A-Za-z]+/g, "").toLowerCase();
  return !verdict || bare !== verdict.toLowerCase();
}

export async function chat(question: string, messageParam = "", now = new Date()): Promise<GenAnswer> {
  const started = Date.now();
  const message = (messageParam || question).trim().slice(0, MAX_INPUT);
  if (!message) return missing("message", "message", { reply: null, brief: null });
  const will = asksWillHappen(message);
  const raw = await phrase({ system: chatSystem(now), user: message, maxTokens: 700, long: true, json: true, clean: (r) => (parseObject(r) ? r : null) });
  const o = raw ? parseObject(raw) : null;
  const reply = plainHyphens(str(o?.reply));
  if (!o || !reply) return unavailable("a reply", { reply: null, brief: null });
  const v = str(o.verdict);
  const verdict = will && /^(Likely|Unlikely|Uncertain)$/.test(v) ? v : will ? (reply.match(/^(Likely|Unlikely|Uncertain)\b/)?.[1] ?? "Uncertain") : null;
  // The model's brief when it says something and fits, else the reply's opening sentence when it fits, else one
  // short rewrite, else that sentence cut at a clause. Never cut() here: its "…" is not a sentence, and brief is
  // the scored field (production 2026-11-14).
  const model = plainHyphens(str(o.brief));
  const flat = reply.replace(/\s+/g, " ").trim();
  const first = opening(flat);
  let brief = usableBrief(model, verdict) && model.length <= 80 ? model : first.length <= 80 ? first : "";
  if (!brief) {
    // The rewrite must end before the handler's 11 s watchdog, which the long call above may have nearly used.
    const two = `${first} ${opening(flat.slice(first.length))}`.trim();
    const fixed = plainHyphens(str(await phrase({ system: REPAIR_SYSTEM, user: `Question: ${message}\nAnswer: ${two}`,
      maxTokens: 150, deadlineMs: Math.min(2_500, 10_000 - (Date.now() - started)) })));
    brief = fixed.length <= 80 && usableBrief(fixed, verdict) && !/(?:…|\.\.\.)$/.test(fixed) ? fixed : clauseBrief(first);
  }
  // The schema's verdict is Likely | Unlikely | Uncertain only; a question that is not a forecast carries none.
  return { reply, brief, ...(verdict ? { verdict } : {}), confidence: CONFIDENCE, source: SOURCE, reason: reply };
}

const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;
type Severity = (typeof SEVERITIES)[number];
export interface Finding { severity: Severity; line: number | null; issue: string; fix: string }

const REVIEW_SYSTEM = `You are a senior code reviewer. Review the code the user sends for correctness, security, performance and clarity. Reply with a JSON object:
{"verdict": "Approve" | "Request changes" | "Comment", "summary": three to six plain sentences that open with exactly "The code is correct." or "The code is not correct.", then explain each serious issue in turn: what it is by its technical name, where it is, why it matters and how to fix it, "findings": [{"severity": "critical"|"high"|"medium"|"low"|"info", "line": line number or null, "issue": the problem by its technical name and why it matters, "fix": the concrete change, with corrected code where short}]}
Order findings by severity, most serious first. Report only real problems; do not invent issues in correct code. "Request changes" when any finding is critical or high; "Approve" only when there is nothing above low.`;

/** Findings as served: known severities only, most serious first. Pure. */
export function normaliseFindings(v: unknown): Finding[] {
  if (!Array.isArray(v)) return [];
  const out: Finding[] = [];
  for (const f of v.slice(0, 20)) {
    if (!f || typeof f !== "object") continue;
    const o = f as Record<string, unknown>;
    const sev = str(o.severity).toLowerCase();
    const issue = str(o.issue);
    if (!issue) continue;
    const line = Number(o.line);
    out.push({ severity: (SEVERITIES as readonly string[]).includes(sev) ? (sev as Severity) : "info",
      line: Number.isInteger(line) && line > 0 ? line : null, issue, fix: str(o.fix) });
  }
  return out.sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity));
}

/** The verdict the findings support: a critical or high finding is never approved. Pure. */
export function reviewVerdict(stated: string, findings: Finding[]): "Approve" | "Request changes" | "Comment" {
  if (findings.some((f) => f.severity === "critical" || f.severity === "high")) return "Request changes";
  if (stated === "Request changes" || stated === "Approve" || stated === "Comment") {
    return stated === "Approve" && findings.some((f) => f.severity === "medium") ? "Comment" : stated;
  }
  return findings.length ? "Comment" : "Approve";
}

/**
 * The summary opening with its correctness sentence. A model that skipped it gets the one its verdict supports:
 * "Request changes" (a critical or high finding) is not correct, "Approve" is correct; "Comment" is left as
 * written, since a medium finding does not settle correctness either way. Pure.
 */
export function reviewSummary(summary: string, verdict: string): string {
  const s = plainHyphens(summary.replace(/\s+/g, " ").trim());
  // A critical or high finding is never summarised as correct code.
  if (verdict === "Request changes" && /^The code is correct\./.test(s)) return s.replace(/^The code is correct\./, "The code is not correct.");
  if (/^The code is (?:not )?correct\./.test(s)) return s;
  if (verdict === "Request changes") return `The code is not correct. ${s}`;
  if (verdict === "Approve") return `The code is correct. ${s}`;
  return s;
}

export async function reviewCode(question: string, codeParam = ""): Promise<GenAnswer> {
  const code = codeParam || question;
  if (!code.trim()) return missing("code", "code", { findings: [], summary: null });
  if (code.length > MAX_INPUT) return oversizedReview("code");
  if (/^\s*https?:\/\/\S+\s*$/.test(code)) {
    return { verdict: "insufficient_input", confidence: 0, error: "link_not_fetched", findings: [], summary: null, source: SOURCE,
      reason: "A link was sent, and links are not fetched. Send the code itself as the code parameter." };
  }
  // A sentence that names or links code carries none to review: "Review this PR: <link>" was answered
  // "The code is not correct." (production 2026-11-14).
  if (!codeParam && !/[{};=<>[\]]|\(.*\)|^\s*(?:def|class|import|from|return|if|for|while)\b/m.test(code.replace(/https?:\/\/\S+/g, ""))) {
    return { verdict: "insufficient_input", confidence: 0, error: "no_code", findings: [], summary: null, source: SOURCE,
      reason: "No code was found in the request, and links are not fetched, so nothing was reviewed. Send the code or diff itself as the code parameter." };
  }
  const raw = await phrase({ system: REVIEW_SYSTEM, user: code, maxTokens: 1_400, long: true, json: true, clean: (r) => (parseObject(r) ? r : null) });
  const o = raw ? parseObject(raw) : null;
  const stated = str(o?.summary);
  if (!o || !stated) return unavailable("a review", { findings: [], summary: null });
  if (!completeReview(o, false)) return { ...unavailable("a complete review", { findings: [], summary: null, finding_count: null }), error: "invalid_model_response" };
  const findings = normaliseFindings(o.findings);
  const verdict = reviewVerdict(str(o.verdict), findings);
  const summary = reviewSummary(stated, verdict);
  const listed = findings.map((f, i) => `${i + 1}) ${f.severity}${f.line ? `, line ${f.line}` : ""}: ${f.issue}${f.fix ? ` Fix: ${f.fix}` : ""}`).join(" ");
  return { verdict, summary, findings, finding_count: findings.length, confidence: CONFIDENCE, source: SOURCE,
    reason: `${verdict}: ${summary}${listed ? ` Findings: ${listed}` : ""}` };
}

/**
 * SMART_CONTRACT_AUDIT — a security audit of supplied Solidity. The intent declared no response format on
 * 2026-11-08 (GET /engine/v1/intents/SMART_CONTRACT_AUDIT_GENERAL: "the intent has no response format"), so
 * the fields follow the leaders' shape: a risk grade, prose that opens with it, and severity-ordered findings.
 */
const AUDIT_SYSTEM = `You are a smart-contract security auditor. Open with one sentence giving the overall risk verdict (Critical/High/Medium/Low/No issues found). Then, for each finding, give its class (reentrancy, access control, unchecked external call, integer/precision, oracle manipulation, front-running, denial of service, upgradeability), the affected function, the severity, why it is exploitable, and the concrete fix with corrected Solidity where short. Report only real issues; say so plainly when the contract is safe. Reply with a JSON object:
{"verdict": "Critical" | "High" | "Medium" | "Low" | "No issues found", "summary": that prose, opening with the verdict sentence, "findings": [{"class": one of the classes above, "function": the affected function's name, "severity": "critical"|"high"|"medium"|"low"|"info", "issue": what is wrong and why it is exploitable, "fix": the concrete change}]}
Order findings by severity, most serious first. The verdict is the severity of the most serious finding.`;

export type RiskGrade = "Critical" | "High" | "Medium" | "Low" | "No issues found";
export interface AuditFinding { class: string; function: string | null; severity: Severity; issue: string; fix: string }

/** Audit findings as served: known severities only, most serious first. Pure. */
export function normaliseAuditFindings(v: unknown): AuditFinding[] {
  if (!Array.isArray(v)) return [];
  const out: AuditFinding[] = [];
  for (const f of v.slice(0, 20)) {
    if (!f || typeof f !== "object") continue;
    const o = f as Record<string, unknown>;
    const issue = str(o.issue);
    if (!issue) continue;
    const sev = str(o.severity).toLowerCase();
    out.push({ class: str(o.class).toLowerCase() || "other", function: str(o.function).replace(/\(\)$/, "") || null,
      severity: (SEVERITIES as readonly string[]).includes(sev) ? (sev as Severity) : "info", issue, fix: str(o.fix) });
  }
  return out.sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity));
}

/** The grade the findings support: the most serious finding's severity; only info notes is no issue. Pure. */
export function riskGrade(findings: AuditFinding[]): RiskGrade {
  const top = findings[0]?.severity;
  return top === "critical" ? "Critical" : top === "high" ? "High" : top === "medium" ? "Medium" : top === "low" ? "Low" : "No issues found";
}

/** The summary opening with the grade the findings support. A model sentence that names another grade is replaced. Pure. */
export function auditSummary(summary: string, grade: RiskGrade): string {
  const s = plainHyphens(summary.replace(/\s+/g, " ").trim());
  const first = opening(s);
  const named = first.match(/\b(critical|high|medium|low|no issues found)\b/i)?.[1];
  const opener = grade === "No issues found" ? "Overall risk: No issues found." : `Overall risk: ${grade}.`;
  if (named && named.toLowerCase() === grade.toLowerCase()) return s;
  // An opening sentence that grades the contract differently from its own findings is dropped, not contradicted.
  const rest = named && /\b(?:overall|risk|verdict|rating|grade)\b/i.test(first) ? s.slice(first.length).trim() : s;
  return rest ? `${opener} ${rest}` : opener;
}

export async function auditContract(question: string, contractParam = ""): Promise<GenAnswer> {
  const source = contractParam || question;
  const none = { findings: [], summary: null, finding_count: null };
  if (!source.trim()) return missing("contract source", "contract", none);
  if (source.length > MAX_INPUT) return oversizedReview("contract source");
  if (/^\s*(?:https?:\/\/\S+|0x[0-9a-fA-F]{40})\s*$/.test(source)) {
    return { ...none, verdict: "insufficient_input", confidence: 0, error: "source_not_fetched", source: SOURCE,
      reason: "A link or an address was sent, and neither is fetched. Send the Solidity source itself as the contract parameter." };
  }
  // A contract named or addressed in a sentence is not its source. "Audit the smart contract at 0x… on Ethereum"
  // was answered "No issues found" (production 2026-11-14): a clean bill for code nobody read.
  if (!contractParam && !(/\b(?:pragma|contract|function|interface|library|mapping|modifier|fn|pub|def)\b/.test(source) && /[{;]|\)\s*:/.test(source))) {
    return { ...none, verdict: "insufficient_input", confidence: 0, error: "no_source", source: SOURCE,
      reason: "No contract source was found in the request, and addresses and links are not fetched, so nothing was audited. Send the Solidity source itself as the contract parameter." };
  }
  const raw = await phrase({ system: AUDIT_SYSTEM, user: source, maxTokens: 1_800, long: true, json: true, clean: (r) => (parseObject(r) ? r : null) });
  const o = raw ? parseObject(raw) : null;
  const stated = str(o?.summary);
  if (!o || !stated) return unavailable("an audit", none);
  if (!completeReview(o, true)) return { ...unavailable("a complete audit", none), error: "invalid_model_response" };
  const findings = normaliseAuditFindings(o.findings);
  const verdict = riskGrade(findings);
  const summary = auditSummary(stated, verdict);
  const listed = findings.map((f, i) => `${i + 1}) ${f.severity} ${f.class}${f.function ? ` in ${f.function}` : ""}: ${f.issue}${f.fix ? ` Fix: ${f.fix}` : ""}`).join(" ");
  return { verdict, summary, findings, finding_count: findings.length, confidence: CONFIDENCE, source: SOURCE,
    reason: `${summary}${listed ? ` Findings: ${listed}` : ""}` };
}

const WRITE_SYSTEM = `You write exactly what the user asks for. Reply with a JSON object:
{"title": a short title for the piece in at most eight words, always given, "text": the requested text only, with no preamble, no notes, no closing offer and no title line}
Honour every stated constraint: length in words, sentences or paragraphs, format, tone, audience and any words to include or avoid. A stated word count is a target to meet within 5%. Keep supplied facts unchanged when rewriting or summarising.`;

/** The word count a prompt asks for ("a 60-word", "in 120 words", "under 200 words"), or null. Pure. */
export function wordTarget(prompt: string): number | null {
  const m = prompt.match(/\b(\d{1,4})[- ]words?\b/i);
  return m ? Number(m[1]) : null;
}

export const words = (t: string): number => (t.trim() ? t.trim().split(/\s+/).length : 0);

/** The model's title when it gave one, else the text's opening words: a title is always served. Pure. */
export function writeTitle(stated: string, text: string): string {
  const t = plainHyphens(stated.replace(/^#+\s*|["“”*]/g, "").replace(/\s+/g, " ").trim());
  if (t) return t.length <= 80 ? t : cut(t, 80);
  // The opening line of a poem or list, else the opening sentence; eight words at most.
  const line = text.split(/\r?\n/).map((l) => l.replace(/^#+\s*|\*\*/g, "").trim()).find(Boolean) ?? "";
  const w = opening(line).replace(/[.!?,;:]+$/, "").split(/\s+/).filter(Boolean);
  return w.length <= 8 ? w.join(" ") : `${w.slice(0, 6).join(" ").replace(/[,;:]+$/, "")}…`;
}

/**
 * The scored brief: a short single-line text whole; a multi-line text's first line (a title line skipped) when
 * it fits, since a poem or a list is read line by line; else the opening sentence, cut to 80. Pure.
 */
export function writeBrief(text: string, title = ""): string {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return text.length <= 80 ? text.trim() : cut(opening(text));
  const strip = (l: string): string => l.replace(/^#+\s*|\*\*/g, "").trim();
  const first = lines.find((l) => strip(l).toLowerCase() !== title.toLowerCase()) ?? lines[0]!;
  return strip(first).length <= 80 ? strip(first) : cut(opening(strip(first)));
}

export async function generateText(question: string, promptParam = ""): Promise<GenAnswer> {
  const prompt = (promptParam || question).trim().slice(0, MAX_INPUT);
  if (!prompt) return missing("writing task", "prompt", { text: null, title: null, brief: null });
  const target = wordTarget(prompt);
  const raw = await phrase({ system: WRITE_SYSTEM, user: prompt, maxTokens: 1_800, long: true, json: true, clean: (r) => (parseObject(r) ? r : null) });
  const o = raw ? parseObject(raw) : null;
  const text = str(o?.text);
  if (!o || !text) return unavailable("the text", { text: null, title: null, brief: null });
  const n = words(text);
  // The brief skips a first line only when it repeats the model's own title, not one derived from that line.
  return { text, title: writeTitle(str(o.title), text), brief: writeBrief(text, str(o.title)), word_count: n, requested_words: target, verdict: "generated", confidence: CONFIDENCE, source: SOURCE,
    reason: text };
}
