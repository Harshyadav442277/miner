#!/usr/bin/env node
/**
 * Preference pairs for LANGUAGE_TRANSLATION_GENERAL from Tatoeba's human translations.
 *
 *   node track2/material/build-translation.mjs [per-language=30]
 *
 * prompt   — a real English Tatoeba sentence and a target language, phrased several ways.
 * chosen   — that sentence's direct human translation.
 * rejected — a real human translation that a weak miner could plausibly return, of two kinds:
 *   near-miss:      the translation of a DIFFERENT sentence found by searching the source's rarest
 *                   words (same topic and words, wrong meaning: "is" vs "isn't", another person);
 *   wrong language: the source's own human translation into another of the five languages.
 * Nothing here is model-written. provenance links the English sentence's Tatoeba page, which shows its
 * author and licence; out/translation-attribution.tsv lists every sentence used, for CC BY.
 */
import fs from "node:fs";
import path from "node:path";

const PER_LANG = Number(process.argv[2] ?? 30);
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "out");
const API = "https://api.tatoeba.org/unstable/sentences";
const LANGS = { fra: "French", spa: "Spanish", deu: "German", ita: "Italian", por: "Portuguese" };
const LICENCES = new Set(["CC BY 2.0 FR", "CC0 1.0"]);
const STOP = new Set("about after again because before being could does doing every from have having into just like more most much must never only other over should some such than that their them then there these they this those through very want were what when where which while will with would your yours".split(" "));
const ASK = [
  (s, l) => `Translate into ${l}: "${s}"`,
  (s, l) => `How would you say "${s}" in ${l}?`,
  (s, l) => `What is the ${l} translation of this sentence? ${s}`,
  (s, l) => `Please translate the following English text to ${l}.\n\n${s}`,
  (s, l) => `I need this in ${l}, natural and accurate: ${s}`,
  (s, l) => `${l} translation, please — "${s}"`,
];

const UA = { "User-Agent": "livecert-evalpool/1.0 (+https://miner-wine.vercel.app)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Tatoeba throttles bursts (2026-11-01: a run fell from 30 rows per language to 0 mid-way). Pace every call
// and retry with backoff, so a throttled answer is never read as "no matches". Random-sort queries take ~10 s
// and sometimes time out server-side as HTTP 500, so they get several tries.
async function get(q) {
  for (let i = 0; i < 8; i++) {
    await sleep(Math.min(400 * 2 ** i, 15000));
    const r = await fetch(`${API}?${q}`, { headers: UA }).catch(() => null);
    if (r?.ok) return (await r.json()).data ?? [];
  }
  throw new Error(`Tatoeba kept failing: ${q}`);
}
// Groups of people, faith, violence and sex: Tatoeba has sentences on these that would make offensive questions.
const SENSITIVE = /\b(jew|jewish|muslim|islam|christian|arab|algeria|israel|palestin|black|white people|gay|lesbian|race|racist|nazi|hitler|kill|murder|rape|suicide|sex|drug|terror|bomb|gun|slave)/i;
const words = (t) => new Set(t.toLowerCase().match(/[a-z']+/g) ?? []);
const overlap = (a, b) => { let n = 0; for (const w of a) if (b.has(w)) n++; return n / Math.max(a.size, b.size); };
const ok = (x) => x && !x.is_unapproved && LICENCES.has(x.license);
const direct = (s, lang) => (s.translations ?? []).find((t) => t.lang === lang && t.is_direct && ok(t));

async function sources(lang) {
  const seen = new Map();
  const base = `lang=eng&trans:lang=${lang}&trans:is_direct=yes&limit=100&showtrans=all`;
  for (let page = 0; page < 10 && seen.size < PER_LANG * 3; page++)
    // The random sort times out server-side for Italian (HTTP 500 after 8 tries, 2026-11-01); the paged
    // word-count sort is the fallback.
    for (const s of await get(`${base}&sort=random`).catch(() => get(`${base}&sort=words&page=${page + 1}`))) {
      if (!ok(s) || !direct(s, lang) || s.text.length < 40 || s.text.length > 200 || /["\n]/.test(s.text) || SENSITIVE.test(s.text)) continue;
      seen.set(s.id, s);
    }
  return [...seen.values()];
}

// A near-miss must demonstrably MEAN something else, or it may be a correct paraphrase (first build,
// 2026-11-01: "A local family have offered you a place to stay" drew a valid rewording as "worse").
const NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twenty: 20, hundred: 100, thousand: 1000 };
const SUBJ = new Set("i we you he she they it tom mary".split(" "));
const nums = (t) => [...(t.toLowerCase().match(/\d+|[a-z]+/g) ?? [])].map((x) => (/^\d+$/.test(x) ? Number(x) : NUM[x])).filter((x) => x !== undefined).sort().join(",");
const negated = (t) => /\b(not|never|no|nobody|nothing)\b|n't\b/i.test(t);
const names = (t) => (t.slice(1).match(/\b[A-Z][a-z]+/g) ?? []).filter((x) => x !== "I").sort().join(",");
const subject = (t) => (t.toLowerCase().match(/[a-z']+/g) ?? []).map((x) => x.replace(/'.*$/, "")).find((x) => SUBJ.has(x)) ?? "";
function meansOtherwise(a, b, shared) {
  return shared < 0.5 || negated(a) !== negated(b) || nums(a) !== nums(b) || names(a) !== names(b) || subject(a) !== subject(b);
}

async function nearMiss(s, lang, tr) {
  const w = words(s.text);
  const linked = new Set((s.translations ?? []).map((t) => t.id));
  const rare = [...w].filter((x) => x.length >= 5 && !STOP.has(x)).sort((a, b) => b.length - a.length).slice(0, 2);
  let best = null, score = 0;
  for (const q of [rare.join(" "), ...rare]) {
    if (!q) continue;
    for (const o of await get(`lang=eng&q=${encodeURIComponent(q)}&sort=relevance&trans:lang=${lang}&trans:is_direct=yes&showtrans=matching&limit=30`)) {
      const ot = direct(o, lang);
      if (o.id === s.id || !ok(o) || !ot || ot.text === tr.text || linked.has(ot.id) || words(o.text).size < 3 || SENSITIVE.test(o.text)) continue;
      const lr = ot.text.length / tr.text.length, v = overlap(w, words(o.text));
      if (lr >= 0.5 && lr <= 1.8 && v > score && meansOtherwise(s.text, o.text, v)) { score = v; best = { o, ot }; }
    }
    if (score >= 0.5) break;
  }
  return score >= 0.3 ? { ...best, score } : null;
}

fs.mkdirSync(OUT, { recursive: true });
const review = [];
const rows = [], attribution = ["lang\tsentence_id\towner\tlicence\ttext"], usedRejected = new Set();
const tally = { "near-miss": 0, "wrong language": 0 };
let k = 0;
for (const [lang, name] of Object.entries(LANGS)) {
  let n = 0;
  const all = await sources(lang).catch((e) => (console.log(`${lang}: skipped, ${e.message}`), []));
  for (const s of all) {
    if (n >= PER_LANG) break;
    const tr = direct(s, lang);
    // Every third row tests the language; the rest test the meaning.
    let rej = null, kind = "near-miss";
    if (k % 3 === 2) {
      const other = Object.keys(LANGS).filter((l) => l !== lang).map((l) => direct(s, l)).find((t) => t && t.text.length / tr.text.length >= 0.6 && t.text.length / tr.text.length <= 1.6);
      if (other) rej = { ot: other }, kind = "wrong language";
    }
    if (!rej) rej = await nearMiss(s, lang, tr).catch(() => null);
    if (!rej || usedRejected.has(rej.ot.text)) continue;
    usedRejected.add(rej.ot.text);
    review.push(`${kind === "wrong language" ? "LANG" : "MISS"} ${lang} | ${s.text} | ${rej.o?.text ?? `(${rej.ot.lang})`}`);
    const frame = (t) => `${name} translation of the English sentence: "${t}"`;
    rows.push({
      prompt: ASK[k++ % ASK.length](s.text, name),
      chosen: frame(tr.text),
      rejected: frame(rej.ot.text),
      label_kind: "preference_pair",
      intent_id: "LANGUAGE_TRANSLATION_GENERAL",
      provenance: { source_kind: "dataset", source_url: `https://tatoeba.org/en/sentences/show/${s.id}` },
    });
    tally[kind]++; n++;
    for (const x of [s, tr, rej.o, rej.ot].filter(Boolean)) attribution.push(`${x.lang}\t${x.id}\t${x.owner ?? ""}\t${x.license}\t${x.text}`);
  }
  console.log(`${lang}: ${n} rows`);
}
fs.writeFileSync(path.join(OUT, "LANGUAGE_TRANSLATION_GENERAL.jsonl"), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
// One line per row: the English source and the English of the sentence whose translation is "worse",
// so a person can confirm every near-miss means something else before it is signed.
fs.writeFileSync(path.join(OUT, "translation-review.txt"), review.map((r, i) => `${i + 1} ${r}`).join("\n") + "\n");
fs.writeFileSync(path.join(OUT, "translation-attribution.tsv"), [...new Set(attribution)].join("\n") + "\n");
console.log(`${rows.length} rows (${JSON.stringify(tally)}) -> out/LANGUAGE_TRANSLATION_GENERAL.jsonl`);
