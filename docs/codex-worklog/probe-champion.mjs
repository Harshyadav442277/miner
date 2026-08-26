#!/usr/bin/env node

/**
 * Offline probe for a Telegraph champion scorer.
 *
 * This intentionally performs no network requests. Download a champion WASM and
 * a public /scores response separately, pin their source URLs, then use this tool
 * to reproduce a reported score or compare a candidate converted answer.
 *
 * Examples:
 *   node probe-champion.mjs --wasm scorer.wasm --scores scores.json --miner livecert --epoch 284
 *   node probe-champion.mjs --wasm scorer.wasm --scores scores.json --miner livecert \
 *     --epoch 284 --answer-file candidate.txt
 */

import { readFile } from "node:fs/promises";

function usage(message) {
  if (message) console.error(message);
  console.error(`
Usage:
  node probe-champion.mjs --wasm FILE --scores FILE --miner SLUG [--epoch N]
                            [--answer TEXT | --answer-file FILE]
  node probe-champion.mjs --wasm FILE --question TEXT --truth TEXT
                            (--answer TEXT | --answer-file FILE)

The public score-record mode defaults to that record's converted_answer. A
candidate answer overrides it. Output also compares miner_answer with
converted_answer, making the conversion boundary visible.
`);
  process.exitCode = message ? 2 : 0;
}

function parseArgs(argv) {
  const parsed = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      usage(`Unexpected argument: ${token}`);
      return null;
    }
    const equal = token.indexOf("=");
    if (equal > 0) {
      parsed.set(token.slice(0, equal), token.slice(equal + 1));
      continue;
    }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      parsed.set(token, true);
      continue;
    }
    parsed.set(token, next);
    i += 1;
  }
  return parsed;
}

function scoreRows(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.scores)) return body.scores;
  if (Array.isArray(body.results)) return body.results;
  throw new Error("The score JSON contains no scores or results array.");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args || args.has("--help")) {
    if (args?.has("--help")) usage();
    return;
  }

  const wasmPath = args.get("--wasm");
  if (typeof wasmPath !== "string") {
    usage("--wasm is required.");
    return;
  }

  let record = null;
  const scoresPath = args.get("--scores");
  if (typeof scoresPath === "string") {
    const miner = args.get("--miner");
    if (typeof miner !== "string") {
      usage("--miner is required with --scores.");
      return;
    }
    const requestedEpoch = args.has("--epoch") ? Number(args.get("--epoch")) : null;
    const body = JSON.parse(await readFile(scoresPath, "utf8"));
    const matches = scoreRows(body)
      .filter((row) => row.miner_slug === miner)
      .filter((row) => requestedEpoch === null || Number(row.epoch_id) === requestedEpoch)
      .sort((a, b) => Number(b.epoch_id) - Number(a.epoch_id));
    record = matches[0] ?? null;
    if (!record) throw new Error(`No score row found for miner ${miner}.`);
  }

  const question = args.get("--question") ?? record?.question;
  const truth = args.get("--truth") ?? record?.ground_truth;
  if (typeof question !== "string" || typeof truth !== "string") {
    usage("Provide --question and --truth, or select a record with --scores and --miner.");
    return;
  }

  let candidate;
  let candidateSource;
  const answerFile = args.get("--answer-file");
  if (typeof answerFile === "string") {
    candidate = (await readFile(answerFile, "utf8")).trim();
    candidateSource = answerFile;
  } else if (typeof args.get("--answer") === "string") {
    candidate = args.get("--answer");
    candidateSource = "--answer";
  } else if (typeof record?.converted_answer === "string") {
    candidate = record.converted_answer;
    candidateSource = "record.converted_answer";
  } else {
    usage("Provide --answer or --answer-file.");
    return;
  }

  const wasm = await readFile(wasmPath);
  const { instance } = await WebAssembly.instantiate(wasm, {});
  const { memory, alloc, rank_answer: rankAnswer } = instance.exports;
  if (!(memory instanceof WebAssembly.Memory) || typeof alloc !== "function" || typeof rankAnswer !== "function") {
    throw new Error("WASM does not expose the Telegraph memory/alloc/rank_answer ABI.");
  }

  const encoder = new TextEncoder();
  function put(value) {
    const bytes = encoder.encode(value);
    const pointer = Number(alloc(bytes.length));
    new Uint8Array(memory.buffer, pointer, bytes.length).set(bytes);
    return [pointer, bytes.length];
  }
  function score(answer) {
    const q = put(question);
    const g = put(truth);
    const a = put(answer);
    return Number(rankAnswer(...q, ...g, ...a));
  }

  const candidateScore = score(candidate);
  const output = {
    wasm: wasmPath,
    intent: record?.intent_id ?? null,
    epoch: record?.epoch_id ?? null,
    miner: record?.miner_slug ?? null,
    candidate_source: candidateSource,
    candidate_score: candidateScore,
  };

  if (record) {
    output.reported_score = Number(record.score);
    output.converted_answer_score = score(record.converted_answer ?? "");
    output.raw_miner_answer_score = score(record.miner_answer ?? "");
    output.candidate_vs_reported_factor = Number(record.score) === 0
      ? null
      : candidateScore / Number(record.score);
  }

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
