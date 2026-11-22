/** Cutting a sentence to a brief at a clause boundary, never mid-phrase. Pure; no network imports. */
const DANGLING = /\s+(?:a|an|the|of|to|in|on|at|by|for|with|from|into|and|or|but|that|which|is|are|was|were|be|as|its|their|this|these)$/i;
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
