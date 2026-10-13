/**
 * The shape every answer leaves in (SEASON2_PLAN, next action 3).
 *
 * Season I's winners returned an `answer` sentence an app can show as is, then
 * the values as fields; ours returned a prose `reason` and little else, because
 * the scorer's converter rewarded lean payloads (S1_WINNERS_TEARDOWN §1). The
 * route's own fields are left exactly as they are. This only adds two:
 *
 * - `answer`, first: the lead sentence of `reason`. Every reason opens with its
 *   answer, so the lead sentence is the answer and not a summary of one.
 * - `checked_at`, always: when the answer was computed. Thirteen of thirty-five
 *   routes set it themselves; a route that already did keeps its own.
 */

/** Words that end in a full stop without ending the sentence. */
const ABBREVIATION = /(?:^|[\s(])(?:e\.g|i\.e|etc|vs|approx|est|cf|al|Fig|No|Nos|St|Mt|Mr|Mrs|Ms|Dr|Prof|Jr|Sr|Inc|Ltd|Co|Corp|U\.S|U\.K|U\.N|E\.U|[A-Z])$/;

/**
 * The first sentence of `text`, or the whole of it when it has only one.
 * Linear: a reason can quote caller text, so only the first 2,000 characters
 * are scanned and each stop tests the ten characters before it, which is
 * longer than any abbreviation above.
 */
export function leadSentence(text: string): string {
  const s = String(text ?? "").trim();
  const end = /[.!?]["'”’)\]]*\s+(?=["'“‘(\[]?[A-Z0-9])/g;
  for (let m = end.exec(s); m && m.index < 2_000; m = end.exec(s)) {
    const before = s.slice(Math.max(0, m.index - 10), m.index);
    if (m[0][0] === "." && ABBREVIATION.test(before)) continue;
    return s.slice(0, m.index + m[0].trimEnd().length);
  }
  return s;
}

export function envelope(body: unknown, now = new Date()): unknown {
  if (body === null || typeof body !== "object" || Array.isArray(body)) return body;
  const b = body as Record<string, unknown>;
  const reason = typeof b.reason === "string" ? b.reason : "";
  return {
    ...(reason ? { answer: leadSentence(reason) } : {}),
    ...b,
    checked_at: typeof b.checked_at === "string" && b.checked_at ? b.checked_at : now.toISOString(),
  };
}
