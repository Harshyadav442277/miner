// Does the Groq call on SENTIMENT_ANALYSIS and TEXT_CLASSIFICATION earn its latency?
// Hand-labelled items, answered with the word list alone and with the model, timed in-process.
// usage: node tools/prose-model-bench.mjs <miner dist-test dir> <env file with GROQ_API_KEY> <out.json>
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const [dist, envFile, outPath] = process.argv.slice(2);
const key = readFileSync(envFile, "utf8").split(/\r?\n/).map((l) => /^GROQ_API_KEY=(.*)$/.exec(l)?.[1]).find(Boolean)?.replace(/^"|"$/g, "").trim();
if (!key) throw new Error("no GROQ_API_KEY in the env file");
const { analyseSentimentPhrased } = require(`${dist}/src/prose-phrase.js`);
const { classifyText } = require(`${dist}/src/classify.js`);

const SENTIMENT = [
  ["The product broke after one day, terrible quality.", "negative"],
  ["Delivery was quick and the staff were lovely.", "positive"],
  ["It works, but the battery life is disappointing.", "mixed"],
  ["Absolutely love this phone, best purchase this year.", "positive"],
  ["The hotel room was filthy and the staff were rude.", "negative"],
  ["Oh great, another update that deletes all my settings. Fantastic.", "negative"],
  ["The food was cold but the service was excellent.", "mixed"],
  ["Not bad at all, I was pleasantly surprised.", "positive"],
  ["I would not recommend this to anyone.", "negative"],
  ["The package arrived on Tuesday.", "neutral"],
  ["Customer support never replied to my three emails.", "negative"],
  ["Five stars, would buy again without hesitation.", "positive"],
  ["The camera is superb, though the app keeps crashing.", "mixed"],
  ["Meh. It does what it says, nothing more.", "neutral"],
  ["This is the worst airline I have ever flown with.", "negative"],
  ["Thanks so much, you saved my day!", "positive"],
  ["The movie was not as good as the book, but still enjoyable.", "mixed"],
  ["I can't believe how easy the setup was.", "positive"],
  ["Prices went up again and the portions got smaller.", "negative"],
  ["The meeting has been moved to 3 pm.", "neutral"],
  ["Nothing works and nobody seems to care.", "negative"],
  ["Honestly the best customer service I've had in years.", "positive"],
  ["Great screen, terrible keyboard.", "mixed"],
  ["Yeah right, like that's ever going to arrive on time.", "negative"],
];
const CLASSIFY = [
  ["sports, politics or technology", "The striker scored twice in the derby.", "sports"],
  ["sports, politics or technology", "Parliament passed the budget bill after a late-night vote.", "politics"],
  ["sports, politics or technology", "The new chip doubles battery life on laptops.", "technology"],
  ["billing, technical or account issue", "I was charged twice for my subscription this month.", "billing"],
  ["billing, technical or account issue", "The app crashes every time I open the camera.", "technical"],
  ["billing, technical or account issue", "I can't log into my account after resetting my password.", "account issue"],
  ["spam or not spam", "You have won a free cruise, click now to claim!", "spam"],
  ["spam or not spam", "Hi Sam, the minutes from Tuesday's meeting are attached.", "not spam"],
  ["finance, sport or health", "Bond yields rose sharply after the inflation report.", "finance"],
  ["finance, sport or health", "Regular exercise lowers the risk of heart disease.", "health"],
  ["urgent or not urgent", "Production is down for all customers right now.", "urgent"],
  ["urgent or not urgent", "Could we move next month's review to Thursday?", "not urgent"],
  ["complaint, praise or question", "Why does shipping to Canada take three weeks?", "question"],
  ["complaint, praise or question", "Your team went above and beyond, thank you.", "praise"],
  ["complaint, praise or question", "The replacement part arrived broken, again.", "complaint"],
  ["weather, traffic or crime", "A crash on the M25 has closed two lanes near Heathrow.", "traffic"],
];

// The free plan allows 30 requests a minute per model; back-to-back calls measure the quota, not the model.
const pace = (withModel) => new Promise((r) => setTimeout(r, withModel ? 2_100 : 0));

async function run(withModel) {
  if (withModel) process.env.GROQ_API_KEY = key; else delete process.env.GROQ_API_KEY;
  const rows = [];
  for (const [text, gold] of SENTIMENT) {
    await pace(withModel);
    const t = performance.now();
    const r = await analyseSentimentPhrased(`What is the sentiment of this review: '${text}'`);
    rows.push({ intent: "SENTIMENT_ANALYSIS", text, gold, got: r.verdict, ms: Math.round(performance.now() - t) });
  }
  for (const [labels, text, gold] of CLASSIFY) {
    await pace(withModel);
    const t = performance.now();
    const r = await classifyText(`Classify this text as ${labels}: '${text}'`);
    rows.push({ intent: "TEXT_CLASSIFICATION", text, gold, got: String(r.label ?? r.verdict).toLowerCase(), ms: Math.round(performance.now() - t) });
  }
  return rows;
}

const pct = (xs, p) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))];
const out = { at: new Date().toISOString(), keyless: await run(false), model: await run(true) };
writeFileSync(outPath, JSON.stringify(out, null, 1));
for (const intent of ["SENTIMENT_ANALYSIS", "TEXT_CLASSIFICATION"]) {
  for (const mode of ["keyless", "model"]) {
    const rows = out[mode].filter((r) => r.intent === intent);
    const right = rows.filter((r) => r.got === r.gold).length;
    const ms = rows.map((r) => r.ms);
    console.log(`${intent.padEnd(20)} ${mode.padEnd(8)} correct ${right}/${rows.length}  p50 ${pct(ms, 0.5)} ms  p90 ${pct(ms, 0.9)} ms`);
  }
  const k = out.keyless.filter((r) => r.intent === intent);
  const m = out.model.filter((r) => r.intent === intent);
  k.forEach((r, i) => { if (r.got !== m[i].got) console.log(`   differ: "${r.text}" gold=${r.gold} keyless=${r.got} model=${m[i].got}`); });
}
