/**
 * Why a model review is incomplete, as a fixed code, or null when it is complete. The code is logged, never the
 * review: production answered `invalid_model_response` to a three-line JavaScript loop with no record of which
 * check failed (2026-11-24, GAPS G363). Pure.
 */
export function reviewProblem(value: Record<string, unknown>, audit: boolean): string | null {
  const verdicts = audit ? ["Critical", "High", "Medium", "Low", "No issues found"] : ["Approve", "Request changes", "Comment"];
  if (typeof value.verdict !== "string") return "verdict_missing";
  if (!verdicts.includes(value.verdict)) return "verdict_not_allowed";
  const findings = value.findings;
  if (!Array.isArray(findings)) return "findings_not_list";
  // The renderer keeps at most 20 findings. Reject an overflow rather than dropping a serious finding at the end.
  if (findings.length > 20) return "findings_over_20";
  for (const finding of findings as unknown[]) {
    if (!finding || typeof finding !== "object" || Array.isArray(finding)) return "finding_not_object";
    const f = finding as Record<string, unknown>;
    if (typeof f.severity !== "string" || !["critical", "high", "medium", "low", "info"].includes(f.severity.trim().toLowerCase())) return "finding_severity";
    if (typeof f.issue !== "string" || !f.issue.trim()) return "finding_issue";
    if (typeof f.fix !== "string") return "finding_fix";
  }
  // Never downgrade a declared risk to "No issues found" because its supporting findings are absent.
  if (audit && value.verdict !== "No issues found" && !(findings as { severity: string }[]).some((f) => f.severity.trim().toLowerCase() !== "info")) {
    return "risk_without_finding";
  }
  return null;
}

/** Reject incomplete model reviews before normalisation can turn missing evidence into approval. */
export function completeReview(value: Record<string, unknown>, audit: boolean): boolean {
  return reviewProblem(value, audit) === null;
}

/**
 * One log line per model review: the verdict the model stated (an allowed word or "other"), the check that failed,
 * the verdict served, the top severity and the input's size. Categorical only, never the code or the review. Pure.
 */
export function reviewLine(path: string, o: Record<string, unknown> | null, problem: string | null, served: string,
  topSeverity: string, input: string): string {
  const words = ["Approve", "Request changes", "Comment", "Critical", "High", "Medium", "Low", "No issues found"];
  const v = typeof o?.verdict === "string" ? o.verdict.trim() : null;
  // An allowed word as sent; one that differs only in case or spacing is marked, since that alone fails the check.
  const near = v === null ? undefined : words.find((w) => w.toLowerCase() === v.toLowerCase().replace(/\s+/g, " "));
  const stated = !o ? "none" : v === null ? "missing" : words.includes(v) ? v : near ? `${near}~case` : "other";
  return `REVIEW ${path} stated=${stated} problem=${problem ?? "none"} served=${served} top=${topSeverity || "none"}` +
    ` bytes=${Buffer.byteLength(input)} lines=${input.split("\n").filter((l) => l.trim()).length}`;
}
