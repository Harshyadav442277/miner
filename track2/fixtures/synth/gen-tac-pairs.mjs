#!/usr/bin/env node
/**
 * TEXT_AUTHENTICITY_CHECK clean-pair generator.
 *
 * Distinct from gen-cv-pairs.mjs: that one is plagiarism-framed (matched
 * source, overlap percentage). This one is AI-detection-framed, which is the
 * register TEXT_AUTHENTICITY_CHECK actually asks in -- verdict, detector
 * confidence, attributed model, perplexity, burstiness.
 *
 * Wrong answers are FLUENT one-fact counterfactuals, never mangled strings:
 * flip exactly the verdict, or the confidence, or the attributed model, or one
 * numeric score, and leave every other word identical. A mangled string is
 * trivially separable and would overstate the margin (Codex audit P0-B).
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";

const TRUTHS = [
  { doc: "essay 'The Ethics of Autonomous Weapons'", verdict: "AI-generated", vAlt: "human-written", conf: 0.93, model: "GPT-4", ppl: 18.4, burst: 0.21 },
  { doc: "short story 'The Lighthouse at Vizhinjam'", verdict: "human-written", vAlt: "AI-generated", conf: 0.88, model: "no model detected", ppl: 74.6, burst: 0.83 },
  { doc: "product review for a wireless keyboard", verdict: "AI-generated", vAlt: "human-written", conf: 0.96, model: "GPT-3.5", ppl: 12.1, burst: 0.14 },
  { doc: "cover letter for a data analyst role", verdict: "AI-generated", vAlt: "human-written", conf: 0.79, model: "Claude", ppl: 22.7, burst: 0.29 },
  { doc: "personal blog entry about training for a marathon", verdict: "human-written", vAlt: "AI-generated", conf: 0.91, model: "no model detected", ppl: 88.2, burst: 0.91 },
  { doc: "news summary of a municipal budget vote", verdict: "AI-generated", vAlt: "human-written", conf: 0.84, model: "GPT-4", ppl: 16.9, burst: 0.19 },
  { doc: "academic abstract on protein folding", verdict: "human-written", vAlt: "AI-generated", conf: 0.72, model: "no model detected", ppl: 61.3, burst: 0.68 },
  { doc: "marketing email announcing a summer sale", verdict: "AI-generated", vAlt: "human-written", conf: 0.97, model: "GPT-3.5", ppl: 10.5, burst: 0.11 },
  { doc: "forum reply about diesel engine maintenance", verdict: "human-written", vAlt: "AI-generated", conf: 0.94, model: "no model detected", ppl: 96.4, burst: 0.88 },
  { doc: "travel guide section on Hampi", verdict: "AI-generated", vAlt: "human-written", conf: 0.81, model: "Gemini", ppl: 20.3, burst: 0.24 },
  { doc: "obituary published in a regional paper", verdict: "human-written", vAlt: "AI-generated", conf: 0.86, model: "no model detected", ppl: 70.1, burst: 0.79 },
  { doc: "technical README for a Rust crate", verdict: "AI-generated", vAlt: "human-written", conf: 0.76, model: "Claude", ppl: 24.8, burst: 0.33 },
];
const OTHER_MODEL = { "GPT-4": "Claude", "GPT-3.5": "Gemini", "Claude": "GPT-4", "Gemini": "GPT-3.5", "no model detected": "GPT-4" };

const gt = t => `The submitted ${t.doc} is assessed as ${t.verdict} with ${Math.round(t.conf*100)}% detector confidence. Attribution: ${t.model}. Mean perplexity ${t.ppl}, burstiness ${t.burst}.`;
// correct paraphrases: same facts, different wording
const paras = t => [
  `The data shows the ${t.doc} is ${t.verdict}, at ${Math.round(t.conf*100)}% confidence, attributed to ${t.model}, with perplexity ${t.ppl} and burstiness ${t.burst}.`,
  `Assessment: ${t.verdict}. Confidence ${Math.round(t.conf*100)}%. Model ${t.model}. Perplexity ${t.ppl}. Burstiness ${t.burst}.`,
  `The ${t.doc} reads as ${t.verdict} (${Math.round(t.conf*100)}% confidence; ${t.model}; perplexity ${t.ppl}; burstiness ${t.burst}).`,
];
// one-fact counterfactuals: exactly one slot changed, everything else identical
const wrongs = t => [
  { slot: "verdict",    text: gt(t).replace(t.verdict, t.vAlt) },
  { slot: "confidence", text: gt(t).replace(`${Math.round(t.conf*100)}%`, `${Math.round(t.conf*100) > 50 ? 100-Math.round(t.conf*100) : Math.round(t.conf*100)+40}%`) },
  { slot: "model",      text: gt(t).replace(`Attribution: ${t.model}`, `Attribution: ${OTHER_MODEL[t.model]}`) },
  { slot: "perplexity", text: gt(t).replace(`perplexity ${t.ppl}`, `perplexity ${(t.ppl*3.7).toFixed(1)}`) },
  { slot: "burstiness", text: gt(t).replace(`burstiness ${t.burst}`, `burstiness ${(1-t.burst).toFixed(2)}`) },
];

const fixtures = TRUTHS.map((t,i) => {
  const answers = [], pairs = [];
  paras(t).forEach((p,k) => answers.push({ id:`correct-${k}`, text:p, quality:1 }));
  answers.push({ id:"correct-verbatim", text:gt(t), quality:1 });
  wrongs(t).forEach(w => answers.push({ id:`wrong-${w.slot}`, text:w.text, quality:0 }));
  for (const a of answers.filter(x=>x.quality===1))
    for (const b of answers.filter(x=>x.quality===0)) pairs.push([a.id,b.id]);
  return { intent:"TEXT_AUTHENTICITY_CHECK", id:`tac-cleanpair-${String(i+1).padStart(2,"0")}`,
    question:`Is the ${t.doc} authentic human writing or AI-generated?`, ground_truth:gt(t), answers, pairs };
});

const src = createHash("sha256").update(JSON.stringify(TRUTHS)).digest("hex").slice(0,16);
writeFileSync("TEXT_AUTHENTICITY_CHECK_CLEAN_PAIR.json", JSON.stringify({
  corpus_version:src, generator:"gen-tac-pairs.mjs", class:"CLEAN-PAIR",
  note:"Fluent one-fact counterfactuals in AI-detection register. Wrong answers differ from the ground truth by exactly one slot.",
  fixtures }, null, 2));
console.log(`wrote ${fixtures.length} fixtures, ${fixtures.reduce((n,f)=>n+f.pairs.length,0)} pairs, corpus_version ${src}`);
