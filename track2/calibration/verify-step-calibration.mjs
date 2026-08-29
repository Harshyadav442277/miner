#!/usr/bin/env node

/**
 * Verifier for a step-calibration candidate.
 *
 * Checks three things on a text corpus, against the raw (uncalibrated) scores
 * of the same base module:
 *
 *   1. exactness   -- candidate(row) equals the f32 evaluation of the declared
 *                     two-band formula applied to raw(row);
 *   2. monotonicity -- for every pair of rows whose raw scores differ, the
 *                     candidate orders them the same way. This is the property
 *                     that keeps fixture wins and historical Spearman intact;
 *   3. range        -- every score is finite and inside [0, 1].
 *
 * Usage:
 *   node verify-step-calibration.mjs --raw raw.wasm --candidate cand.wasm \
 *     --threshold 0.75 --low 0.02 --high 0.05 [--corpus rows.json]
 *
 * `--raw` is a build-raw-export.mjs output of the same base. Without
 * `--corpus`, a built-in spread of rows is used.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadScorer } from "../harness/wasm-abi.mjs";

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) {
    if (fallback !== undefined) return fallback;
    throw new Error(`missing ${name}`);
  }
  return process.argv[index + 1];
}

const DEFAULT_CORPUS = [
  ["Translate to French: the library opens at nine.", "La bibliotheque ouvre a neuf heures.", "La bibliotheque ouvre a neuf heures."],
  ["Translate to French: the library opens at nine.", "La bibliotheque ouvre a neuf heures.", "La bibliotheque ouvre a dix heures."],
  ["Translate to French: the library opens at nine.", "La bibliotheque ouvre a neuf heures.", "The library opens at nine."],
  ["Translate to French: the library opens at nine.", "La bibliotheque ouvre a neuf heures.", "Je ne sais pas."],
  ["Translate to French: the library opens at nine.", "La bibliotheque ouvre a neuf heures.", ""],
  ["Translate to Spanish: the meeting was postponed.", "La reunion fue pospuesta.", "La reunion fue pospuesta."],
  ["Translate to Spanish: the meeting was postponed.", "La reunion fue pospuesta.", "La reunion se aplazo."],
  ["Translate to Spanish: the meeting was postponed.", "La reunion fue pospuesta.", "La reunion fue confirmada."],
  ["Translate to Spanish: the meeting was postponed.", "La reunion fue pospuesta.", "Buenos dias."],
  ["Translate to German: the train leaves from platform four.", "Der Zug faehrt von Gleis vier ab.", "Der Zug faehrt von Gleis vier ab."],
  ["Translate to German: the train leaves from platform four.", "Der Zug faehrt von Gleis vier ab.", "Der Zug faehrt von Gleis sieben ab."],
  ["Translate to German: the train leaves from platform four.", "Der Zug faehrt von Gleis vier ab.", "Der Bus faehrt ab."],
  ["Translate to German: the train leaves from platform four.", "Der Zug faehrt von Gleis vier ab.", "Guten Abend."],
  ["Translate to Japanese: where is the nearest hospital?", "Ichiban chikai byouin wa doko desu ka.", "Ichiban chikai byouin wa doko desu ka."],
  ["Translate to Japanese: where is the nearest hospital?", "Ichiban chikai byouin wa doko desu ka.", "Ichiban chikai eki wa doko desu ka."],
  ["Translate to Japanese: where is the nearest hospital?", "Ichiban chikai byouin wa doko desu ka.", "Arigatou gozaimasu."],
  ["Translate to Italian: the invoice has already been paid.", "La fattura e gia stata pagata.", "La fattura e gia stata pagata."],
  ["Translate to Italian: the invoice has already been paid.", "La fattura e gia stata pagata.", "La fattura non e stata pagata."],
  ["Translate to Italian: the invoice has already been paid.", "La fattura e gia stata pagata.", "Il pagamento e stato completato."],
  ["Translate to Italian: the invoice has already been paid.", "La fattura e gia stata pagata.", "Non lo so."],
  ["Translate to Portuguese: please sign the document today.", "Por favor assine o documento hoje.", "Por favor assine o documento hoje."],
  ["Translate to Portuguese: please sign the document today.", "Por favor assine o documento hoje.", "Assine o documento amanha."],
  ["Translate to Portuguese: please sign the document today.", "Por favor assine o documento hoje.", "Obrigado pela ajuda."],
  ["Translate to Dutch: the shop is closed on Sunday.", "De winkel is op zondag gesloten.", "De winkel is op zondag gesloten."],
  ["Translate to Dutch: the shop is closed on Sunday.", "De winkel is op zondag gesloten.", "De winkel is op zondag open."],
  ["Translate to Dutch: the shop is closed on Sunday.", "De winkel is op zondag gesloten.", "Tot ziens."],
];

const threshold = Number(arg("--threshold"));
const low = Number(arg("--low", "0.02"));
const high = Number(arg("--high", "0.05"));
const corpusPath = arg("--corpus", "");
const rows = corpusPath ? JSON.parse(await readFile(resolve(corpusPath), "utf8")) : DEFAULT_CORPUS;

const championPath = arg("--champion", "");
const [raw, candidate, champion] = await Promise.all([
  loadScorer(resolve(arg("--raw")), "raw"),
  loadScorer(resolve(arg("--candidate")), "candidate"),
  championPath ? loadScorer(resolve(championPath), "champion") : null,
]);

// The module holds these as f32 literals, so round them once here too --
// comparing against the f64 values would fail on the last bit.
const F32_THRESHOLD = Math.fround(threshold);
const F32_LOW = Math.fround(low);
const F32_HIGH = Math.fround(high);
const F32_BASE = Math.fround(1 - high);

/** The formula the module evaluates, in f32, so the comparison is exact. */
function calibrate(score) {
  return score >= F32_THRESHOLD
    ? Math.fround(F32_BASE + Math.fround(F32_HIGH * score))
    : Math.fround(F32_LOW * score);
}

const scored = [];
let separated = 0;
for (const row of rows) {
  const rawScore = raw.score(...row);
  const actual = candidate.score(...row);
  assert.equal(actual, calibrate(rawScore), `row ${JSON.stringify(row[2])}: raw ${rawScore} became ${actual}`);
  assert.ok(Number.isFinite(actual) && actual >= 0 && actual <= 1, `score out of range: ${actual}`);
  if (rawScore >= F32_THRESHOLD) separated += 1;
  scored.push({ row, rawScore, actual, championScore: champion ? champion.score(...row) : null });
}

// Ordering: over every pair of rows, a strictly higher raw score must stay
// strictly higher after calibration. A tie here is the failure mode that cost
// registration 1765 three fixture cases.
let compared = 0;
let championCompared = 0;
let championTies = 0;
for (let i = 0; i < scored.length; i += 1) {
  for (let j = i + 1; j < scored.length; j += 1) {
    const a = scored[i];
    const b = scored[j];
    if (a.rawScore === b.rawScore) continue;
    compared += 1;
    const rawOrder = Math.sign(a.rawScore - b.rawScore);
    assert.equal(
      Math.sign(a.actual - b.actual),
      rawOrder,
      `ordering broke: raw ${a.rawScore} vs ${b.rawScore} became ${a.actual} vs ${b.actual}`,
    );
    // The candidate matches the champion's fixture win count as long as the
    // champion never *inverts* the raw order. Where the champion collapses two
    // distinct raw scores to one f32 value it loses a comparison the candidate
    // still resolves, so those pairs can only go our way -- they are counted,
    // not rejected.
    if (champion) {
      championCompared += 1;
      const championOrder = Math.sign(a.championScore - b.championScore);
      if (championOrder === 0) championTies += 1;
      else {
        assert.equal(
          championOrder,
          rawOrder,
          `champion inverts raw: ${a.rawScore} vs ${b.rawScore} became ${a.championScore} vs ${b.championScore}`,
        );
      }
    }
  }
}

const rawScores = scored.map((entry) => entry.rawScore).sort((a, b) => a - b);
console.log(JSON.stringify({
  rows: rows.length,
  threshold,
  low,
  high,
  orderedPairsChecked: compared,
  championPairsChecked: championCompared,
  championTiesTheCandidateResolves: championTies,
  rowsAboveThreshold: separated,
  rawMin: rawScores[0],
  rawMedian: rawScores[Math.floor(rawScores.length / 2)],
  rawMax: rawScores[rawScores.length - 1],
}, null, 2));
