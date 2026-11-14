/** Reject incomplete model reviews before normalisation can turn missing evidence into approval. */
export function completeReview(value: Record<string, unknown>, audit: boolean): boolean {
  const verdicts = audit ? ["Critical", "High", "Medium", "Low", "No issues found"] : ["Approve", "Request changes", "Comment"];
  if (typeof value.verdict !== "string" || !verdicts.includes(value.verdict)) return false;
  const findings = value.findings;
  // The renderer keeps at most 20 findings. Reject an overflow rather than dropping a serious finding at the end.
  if (!Array.isArray(findings) || findings.length > 20) return false;
  const valid = findings.every((finding: unknown) => {
    if (!finding || typeof finding !== "object" || Array.isArray(finding)) return false;
    const f = finding as Record<string, unknown>;
    return typeof f.severity === "string" && ["critical", "high", "medium", "low", "info"].includes(f.severity.trim().toLowerCase())
      && typeof f.issue === "string" && f.issue.trim().length > 0 && typeof f.fix === "string";
  });
  if (!valid) return false;
  // Never downgrade a declared risk to "No issues found" because its supporting findings are absent.
  return !audit || value.verdict === "No issues found" || findings.some((f) => f.severity.trim().toLowerCase() !== "info");
}
