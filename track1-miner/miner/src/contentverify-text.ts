/**
 * Pure text helpers for CONTENT_VERIFICATION: pulling the supplied content out
 * of the question, and a word-level comparison of two versions. Kept apart from
 * the network code so both are tested without a socket.
 */

/**
 * Quoted spans of at least twenty characters, longest first within each
 * question, in the order they appear.
 *
 * The canonical examples quote with SINGLE quotes — "Here's the text of a press
 * release: '...'" — which extractPassage in aidetect.ts does not read. An
 * apostrophe inside a word ("company's") is not a quote mark, so a single quote
 * only opens after whitespace or a colon and only closes before whitespace or
 * punctuation. A payload after "text:" with no quotes at all is read too.
 */
export function quotedSpans(text: string): string[] {
  const s = String(text ?? "");
  const out: string[] = [];
  const add = (raw: string): void => {
    // Not whitespace-normalised: a supplied digest is over the exact bytes.
    const v = raw.trim();
    if (v.length >= 20 && !out.includes(v)) out.push(v);
  };
  for (const v of doubleQuoted(s)) add(v);
  if (out.length) return out;
  for (const m of s.matchAll(/(?:^|[\s:(])['‘]([\s\S]{20,}?)['’](?=[\s.,;:!?)]|$)/g)) add(m[1] ?? "");
  if (out.length) return out;
  const colon = s.match(/\b(?:text|clause|release|statement|content|passage|wording|excerpt|copy)\b[^:]{0,40}:\s*([\s\S]{40,})$/i);
  const body = colon?.[1]?.replace(/\s*(?:Is|Was|Has|Can|Does)\s+(?:this|it)\b[\s\S]*$/i, "").trim();
  return body && body.length >= 40 ? [body.replace(/\s+/g, " ")] : [];
}

/**
 * Double-quoted spans that may hold inner quoted terms. Contract clauses quote
 * their defined terms — 'The "Supplier" shall indemnify the "Buyer"...' — and a
 * [^"]-style pattern ended the span at "The ". A quote mark closes the span only
 * when it is followed by whitespace, punctuation or the end AND the quote marks
 * seen inside the span so far pair up; any other quote mark is an inner one.
 */
export function doubleQuoted(s: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    const rel = s.slice(i).search(/["“”]/);
    if (rel < 0) break;
    const open = i + rel;
    let inner = 0;
    let close = -1;
    for (let k = open + 1; k < s.length; k++) {
      const ch = s[k];
      if (ch !== '"' && ch !== "“" && ch !== "”") continue;
      const next = s[k + 1] ?? "";
      if (ch !== "“" && inner % 2 === 0 && (next === "" || /[\s.,;:!?)\]]/.test(next))) { close = k; break; }
      inner++;
    }
    if (close < 0) break;
    out.push(s.slice(open + 1, close));
    i = close + 1;
  }
  return out;
}

const wordsOf = (s: string): string[] => s.split(/\s+/).filter(Boolean);

/**
 * Wikitext reduced to its words, so a sentence broken by a link or bold markup
 * still compares equal to the plain sentence someone pasted.
 */
export function plainWords(wikitext: string): string[] {
  // Tags go, their contents stay: a footnote is where a court opinion quotes a
  // document, and a self-closing <ref/> would make a lazy ref-stripping pattern
  // swallow the text after it.
  let s = String(wikitext ?? "").replace(/<[^>]+>/g, " ");
  let prev = "";
  // A formatting template keeps its last parameter: Wikisource writes the
  // preamble's opening as {{sc|We the People}}, and deleting templates whole
  // made the genuine text read as altered. A bare {{template}} carries no words.
  const keepLast = (_m: string, inner: string): string => {
    const parts = inner.split("|");
    return parts.length > 1 ? ` ${(parts[parts.length - 1] ?? "").replace(/^[^=]*=/, "")} ` : " ";
  };
  while (s !== prev) { prev = s; s = s.replace(/\{\{([^{}]*)\}\}/g, keepLast); }
  // A replacer function, never a "$1" string (G103's second variant).
  s = s.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, (_m: string, label: string) => label).replace(/'{2,}/g, "");
  return normWords(s);
}

export function normWords(text: string): string[] {
  // Apostrophes survive inside a word ("company's") and are trimmed at its
  // edges, so a passage quoted as 'We the People compares equal to We the People.
  const raw = String(text ?? "").toLowerCase().normalize("NFKD").replace(/[’‘]/g, "'").match(/[a-z0-9']+/g) ?? [];
  return raw.map((w) => w.replace(/^'+|'+$/g, "")).filter(Boolean);
}

/**
 * Every six-word window of the passage, stride three, checked against the
 * source. Sampling three runs is NOT enough: measured 2026-09-12, a preamble with
 * "insure domestic Tranquility" changed to "guarantee national Security" was
 * reported as matching, because the three sampled runs fell either side of the
 * edit. Windows that overlap cover every word, so an edit cannot fall between.
 */
export function unmatchedWindows(passage: string[], source: string[], size = 6, stride = 3): string[] {
  if (passage.length < size) return [];
  const hay = ` ${source.join(" ")} `;
  const missing: string[] = [];
  for (let i = 0; ; i += stride) {
    const start = Math.min(i, passage.length - size);
    const w = passage.slice(start, start + size).join(" ");
    if (!hay.includes(` ${w} `) && !missing.includes(w)) missing.push(w);
    if (start === passage.length - size) break;
  }
  return missing;
}

/**
 * The places two versions differ, as short readable phrases. Longest common
 * subsequence over words: 400 words each is 160,000 cells, well inside budget.
 */
export function wordDiff(a: string, b: string, cap = 400): string[] {
  const x = wordsOf(a).slice(0, cap);
  const y = wordsOf(b).slice(0, cap);
  const n = x.length;
  const m = y.length;
  const L: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      L[i]![j] = x[i] === y[j] ? L[i + 1]![j + 1]! + 1 : Math.max(L[i + 1]![j]!, L[i]![j + 1]!);
    }
  }
  const changes: string[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && x[i] === y[j]) { i++; j++; continue; }
    const del: string[] = [];
    const add: string[] = [];
    while ((i < n || j < m) && !(i < n && j < m && x[i] === y[j])) {
      if (j >= m || (i < n && L[i + 1]![j]! >= L[i]![j + 1]!)) del.push(x[i++]!);
      else add.push(y[j++]!);
    }
    const q = (w: string[]): string => `"${w.slice(0, 8).join(" ")}${w.length > 8 ? " …" : ""}"`;
    if (del.length && add.length) changes.push(`${q(del)} became ${q(add)}`);
    else if (del.length) changes.push(`${q(del)} was removed`);
    else changes.push(`${q(add)} was added`);
  }
  return changes;
}
