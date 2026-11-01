// Runs timeless web-search questions through the compiled miner, no Groq key: the extraction path.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const dist = process.argv[2];
delete process.env.GROQ_API_KEY;
const { webSearch } = require(`${dist}/src/websearch.js`);
const { answerQuestion } = require(`${dist}/src/qa.js`);
const qs = process.argv.slice(3).length ? process.argv.slice(3) : [
  "Who wrote Pride and Prejudice?",
  "What is the capital of Australia?",
  "Who painted the Mona Lisa?",
  "Who invented the telephone?",
  "What is the capital of Canada?",
  "Who wrote War and Peace?",
  "Who directed The Godfather?",
  "When did the Berlin Wall fall?",
  "How many moons does Mars have?",
  "What is the tallest mountain in the world?",
  "Who discovered penicillin?",
  "What is the largest ocean on Earth?",
  "Who wrote Romeo and Juliet?",
  "What is the capital of Brazil?",
  "Who is the current CEO of Microsoft?",
  "Where is the Taj Mahal?",
  "What language is spoken in Brazil?",
  "Who composed The Four Seasons?",
  "What is the boiling point of water?",
  "Who was the first person to walk on the Moon?",
];
for (const q of qs) {
  const qa = await answerQuestion(q);
  const ws = await webSearch(q);
  console.log(`\n## ${q}\n  sources: ${(qa.citations ?? []).map((c) => c.title).join(" | ")}\n  web: ${ws.verdict}: ${String(ws.reason).slice(0, 260)}`);
}
