// Same 20 questions, model path: local branch code with GROQ_API_KEY (read from an env file, never printed)
// against production. Usage: node g207-model.mjs <dist-test dir> <env file>
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const [dist, envFile] = process.argv.slice(2);
for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const m = line.match(/^GROQ_API_KEY=(.*)$/);
  if (m) process.env.GROQ_API_KEY = m[1].replace(/^"|"$/g, "").trim();
}
if (!process.env.GROQ_API_KEY) throw new Error("no key");
const { webSearch } = require(`${dist}/src/websearch.js`);
const qs = [
  "Who wrote Pride and Prejudice?", "What is the capital of Australia?", "Who painted the Mona Lisa?",
  "Who invented the telephone?", "What is the capital of Canada?", "Who wrote War and Peace?",
  "Who directed The Godfather?", "When did the Berlin Wall fall?", "How many moons does Mars have?",
  "What is the tallest mountain in the world?", "Who discovered penicillin?", "What is the largest ocean on Earth?",
  "Who wrote Romeo and Juliet?", "What is the capital of Brazil?", "Who is the current CEO of Microsoft?",
  "Where is the Taj Mahal?", "What language is spoken in Brazil?", "Who composed The Four Seasons?",
  "What is the boiling point of water?", "Who was the first person to walk on the Moon?",
];
const short = (r) => `${r.verdict} | ${String(r.reason).slice(0, 200)}`;
for (const q of qs) {
  const local = await webSearch(q);
  const prod = await fetch(`https://miner-wine.vercel.app/web-search?query=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(25_000) })
    .then((r) => r.json()).catch((e) => ({ verdict: "error", reason: String(e) }));
  console.log(`\n## ${q}\n  branch: ${short(local)}\n  prod:   ${short(prod)}`);
}
