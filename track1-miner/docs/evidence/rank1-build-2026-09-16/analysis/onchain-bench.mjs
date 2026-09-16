// Score answer shapes for the two leaked block-25,700,000 hashes under champion reg642,
// using the two independently CROSSING miners' real answers as references.
// Validation: txlens vs veyctum must score high against each other (both cross at ~0.995
// in production); otherwise neither is usable as a reference (G114 rule).
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const REPO = "C:/Users/hyada/OneDrive/Documents/Work-Related/Hackathons/Telegraph";
const S = "C:/Users/hyada/AppData/Local/Temp/claude/C--Users-hyada-OneDrive-Documents-Work-Related-Hackathons-Telegraph/79b247f9-6393-43c1-bc57-4661514f8346/scratchpad";
const { loadScorer } = await import(pathToFileURL(`${REPO}/track2/harness/wasm-abi.mjs`).href);
const scorer = await loadScorer(`${REPO}/track2/harness/champions/onchain_tx_lookup_reg642.wasm`, "reg642");

const clip32 = (s) => s.split(/\s+/).slice(0, 32).join(" ");
const fmt = (v) => (v > 0.001 ? v.toFixed(4) : v.toExponential(2));

const cases = [
  { h: "0xb376975e90801e36a34432c960825a0c12a56d589a77a95aa552a7a3618678ee", short: "0xb376975e",
    q: "What did transaction 0xb376975e90801e36a34432c960825a0c12a56d589a77a95aa552a7a3618678ee do?",
    from: "0x2ce910fbba65b454bbaf6a18c952a70f3bcd8299", to: "0x99c9fc46f92e8a1c0dec1b1747d010903e884be1", method: "bridgeERC20To", status: "succeeded", verb: "succeeded" },
  { h: "0xe1cd7c312e8cedad3bb8b3030703a90cb93d48d35a554082001b0e2edaa97e19", short: "0xe1cd7c31",
    q: "What did transaction 0xe1cd7c312e8cedad3bb8b3030703a90cb93d48d35a554082001b0e2edaa97e19 do?",
    from: "0x8a0231d6fb864a3ae9439a860871510249c31d07", to: "0x66a9893cc07d91d95644aedd05d03f95e1dba8af", method: "execute", status: "reverted", verb: "failed and was reverted" },
];

for (const c of cases) {
  const ours = JSON.parse(readFileSync(`${S}/onchain/ours-${c.short}.json`, "utf8")).reason;
  const txlens = JSON.parse(readFileSync(`${S}/onchain/txlens-${c.short}.json`, "utf8")).answer;
  const veyctum = JSON.parse(readFileSync(`${S}/onchain/veyctum-${c.short}.json`, "utf8")).answer;
  const block = "25700000";
  const candidates = {
    "ours (production)": ours,
    "ours minus gas/fee/price": ours.replace(/ It used [^.]*\. /, " ").replace(/ It used [^.]*\./, "."),
    "ours minus gas/fee/price, plain block": ours.replace(/ It used [^.]*\. /, " ").replace(/ It used [^.]*\./, ".").replace("25,700,000", block),
    "ours minus gas, plain block, + method": ours.replace(/ It used [^.]*\. /, " ").replace(/ It used [^.]*\./, ".").replace("25,700,000", block)
      .replace(/(from 0x[0-9a-f]{40} to 0x[0-9a-f]{40})\./, `$1 and called ${c.method}.`),
    "minimal txlens-like": `Transaction ${c.h} on Ethereum sent 0 ETH from ${c.from} to ${c.to} and called ${c.method} in block ${block}; status ${c.status === "succeeded" ? "success" : "failed"}.`,
    "ours shape, method, no gas, keep transfer count": `Transaction ${c.h} on ethereum ${c.verb} in block ${block}. It moved 0 ETH from ${c.from} to ${c.to} and called ${c.method}.` + (c.status === "succeeded" ? " The receipt contains 1 token Transfer event." : " A reverted transaction still consumes its gas; the value transfer did not occur."),
    "ours + method, keep gas/fee": ours.replace(/(from 0x[0-9a-f]{40} to 0x[0-9a-f]{40})\./, `$1 and called ${c.method}.`),
    "txlens (crosses live)": txlens,
    "veyctum (crosses live)": veyctum,
  };
  console.log(`\n=== ${c.short} (${c.status}) — columns: truth=txlens | truth=veyctum | clip32 vs txlens | clip32 vs veyctum`);
  for (const [name, text] of Object.entries(candidates)) {
    const a = scorer.score(c.q, txlens, text), b = scorer.score(c.q, veyctum, text);
    const a32 = scorer.score(c.q, txlens, clip32(text)), b32 = scorer.score(c.q, veyctum, clip32(text));
    console.log(`${name.padEnd(48)} ${fmt(a).padStart(9)} ${fmt(b).padStart(9)} ${fmt(a32).padStart(9)} ${fmt(b32).padStart(9)}`);
  }
  console.log("  --- candidate texts:");
  for (const [name, text] of Object.entries(candidates)) if (!/crosses live|production/.test(name)) console.log(`  [${name}] ${text}`);
}
