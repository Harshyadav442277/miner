#!/usr/bin/env node
/**
 * Call every endpoint the way Telegraph's engine actually calls it.
 *
 * The engine builds the request from our declared `input_schema`: it fills the
 * parameters it can, sends the ones it cannot as EMPTY STRINGS, and may also
 * send `query`. Two epochs were lost to that shape alone — 288 (weather sent
 * `location=""` for a question naming coordinates) and 290 (a translate
 * refusal) — and neither was visible to the unit tests or to verify-deploy,
 * because both call the endpoints the way a human would.
 *
 * The second half of this file covers the generalized case found on
 * 2026-08-30: the engine fills the declared subject and sends a `query` that
 * refers back to it as "this wallet", "there", "this subject". Six of the ten
 * routes discarded the subject there. Four refused outright — a guaranteed 0
 * for the epoch — and two answered CONFIDENTLY WRONG: `/papers` returned
 * neuroimaging papers for a CRISPR topic, and `/storm-alert` asked about
 * Chennai reported the storm risk for Teresópolis, Brazil.
 *
 * A case fails when the request carries enough to answer and the miner refuses
 * anyway, or when the answer does not mention the subject it was asked about.
 *
 *   node track1-miner/tools/param-shapes.mjs [base-url]
 *
 * Exits non-zero on any failure, so it can gate a deploy.
 */
const BASE = process.argv[2] ?? "https://miner-wine.vercel.app";
const ADDR = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

/**
 * [endpoint, params, mustAnswer]
 * mustAnswer=true  -> enough information is present; a refusal is a bug.
 * mustAnswer=false -> genuinely unanswerable; an honest 200 refusal is correct.
 */
const SHAPES = [
  ["/ssl-check", { domain: "github.com" }, true],
  ["/ssl-check", { query: "Is the SSL certificate for github.com valid?" }, true],
  ["/ssl-check", { domain: "github.com", query: "Is the SSL certificate for github.com valid?" }, true],
  ["/ssl-check", { domain: "", query: "Is the SSL certificate for github.com valid?" }, true],
  ["/ssl-check", { domain: "github.com", query: "" }, true],

  ["/papers", { topic: "CRISPR gene editing" }, true],
  ["/papers", { query: "Find recent papers on CRISPR gene editing" }, true],
  ["/papers", { topic: "", query: "Find recent papers on CRISPR gene editing" }, true],
  ["/papers", { topic: "CRISPR gene editing", query: "" }, true],

  ["/translate", { text: "Good morning", target_language: "French" }, true],
  ["/translate", { query: 'Translate "Good morning" into French.' }, true],
  ["/translate", { text: "Good morning", target_language: "French", query: "" }, true],
  ["/translate", { text: "Good morning", target_language: "French", query: "Translate this into French." }, true],
  ["/translate", { text: "", target_language: "French", query: 'Translate "Good morning" into French.' }, true],

  ["/ip-geolocate", { ip: "8.8.8.8" }, true],
  ["/ip-geolocate", { query: "Where is 8.8.8.8 located and does it have abuse history?" }, true],
  ["/ip-geolocate", { ip: "8.8.8.8", query: "Where is this IP and does it have abuse history?" }, true],
  ["/ip-geolocate", { ip: "192.168.1.10" }, true],
  ["/ip-geolocate", { ip: "", query: "Where is 8.8.8.8 located?" }, true],

  ["/weather-forecast", { location: "London" }, true],
  ["/weather-forecast", { query: "What is the weather forecast for London over the next 24 hours?" }, true],
  ["/weather-forecast", { location: "", lat: "37.7749", lon: "-122.4194" }, true],
  ["/weather-forecast", { location: "London", hours: "48" }, true],
  ["/weather-forecast", { location: "", query: "Forecast for London tomorrow" }, true],

  ["/storm-alert", { location: "Chennai" }, true],
  ["/storm-alert", { query: "Is there a storm risk in Chennai in the next 48 hours?" }, true],
  ["/storm-alert", { location: "", lat: "13.08", lon: "80.27" }, true],
  ["/storm-alert", { location: "Chennai", query: "" }, true],

  // detectAiText documents a 40-word floor: below it none of the statistics
  // mean anything, so a refusal is the honest answer and the correct one.
  ["/ai-detect", { text: "The rapid proliferation of artificial intelligence has fundamentally transformed numerous sectors across the global economy. Moreover, it is important to note that these developments continue to accelerate at an unprecedented pace, reshaping how organisations approach strategic planning and operational efficiency in ways that were previously unimaginable to most industry observers working today." }, true],
  ["/ai-detect", { query: "Was this written by AI? 'The rapid proliferation of AI has transformed numerous sectors.'" }, false],
  ["/ai-detect", { text: "hey so i went to the store yesterday and honestly it was a mess, lines everywhere" }, false],

  ["/extract", { text: "Reach us at support@example.com or call 555-0192." }, true],
  ["/extract", { query: 'Extract the contact details from: "Reach us at support@example.com or call 555-0192."' }, true],
  ["/extract", { text: "Reach us at support@example.com or call 555-0192.", query: "Extract the contact details from this text." }, true],
  ["/extract", { text: "The shipment weighs 45 kilograms and is 2.3 meters long.", query: "Extract the quantities and units." }, true],

  ["/headlines", { topic: "technology" }, true],
  ["/headlines", { query: "What are the top 5 technology headlines today?" }, true],
  ["/headlines", { topic: "technology", query: "Give me the top 5 headlines in Japan." }, true],

  ["/wallet-balance", { address: ADDR }, true],
  ["/wallet-balance", { query: `What is the ETH balance of ${ADDR}?` }, true],
  ["/wallet-balance", { address: ADDR, query: `What is the ETH balance of ${ADDR}?` }, true],
  ["/wallet-balance", { address: ADDR, query: "What is the ETH balance of this wallet?" }, true],
  ["/wallet-balance", { address: ADDR, query: "How much USDT does this address hold on Base?" }, true],

  ["/ssl-check", { domain: "", query: "" }, false],
  ["/wallet-balance", { address: "", query: "" }, false],
  ["/extract", { text: "", query: "" }, false],
];

/**
 * [endpoint, params, /regex the answer must match/]
 * The engine fills the declared subject; the query only points back at it.
 */
const SUBJECTS = [
  ["/ssl-check", { domain: "github.com", query: "Is this site's TLS certificate currently valid?" }, "github\\.com"],
  ["/papers", { topic: "CRISPR gene editing", query: "Find me recent papers on this subject." }, "CRISPR|gene"],
  ["/ip-geolocate", { ip: "8.8.8.8", query: "Where is this address located?" }, "8\\.8\\.8\\.8|Google"],
  ["/weather-forecast", { location: "London", query: "What is the forecast there for tomorrow?" }, "London"],
  ["/storm-alert", { location: "Chennai", query: "Is there a storm risk there in the next 48 hours?" }, "Chennai"],
  ["/translate", { text: "Good morning", target_language: "French", query: "Translate it." }, "onjour"],
  ["/extract", { text: "Reach us at support@example.com or call 555-0192.", query: "Extract the contact details." }, "support@example"],
  ["/headlines", { topic: "technology", query: "Give me the top 5 on that." }, "\\w"],
  ["/wallet-balance", { address: ADDR, query: "What is the balance of this wallet?" }, ADDR],
];

const REFUSAL =
  /(could not be|no (valid )?\w+ was supplied|was supplied with this request|supply a|name a subject|no text was supplied|no resolvable location|were found in the supplied)/i;
const ERRORS = new Set([
  "invalid_input", "invalid_address", "invalid_location", "invalid_ip", "invalid_domain",
]);

async function call(ep, params) {
  const u = new URL(BASE + ep);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const t0 = Date.now();
  const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
  const body = await r.json();
  return { status: r.status, body, ms: Date.now() - t0 };
}

let fail = 0, pass = 0;

console.log(`param shapes against ${BASE}\n`);
for (const [ep, params, mustAnswer] of SHAPES) {
  let out;
  try { out = await call(ep, params); }
  catch (e) { fail++; console.log(`FAIL  ${ep}  ${JSON.stringify(params).slice(0, 90)}\n      transport: ${e.message}`); continue; }
  const reason = typeof out.body?.reason === "string" ? out.body.reason : "";
  const refused = REFUSAL.test(reason) || ERRORS.has(out.body?.error);
  const problems = [];
  if (out.status !== 200) problems.push(`HTTP ${out.status}`);
  if (!reason.trim()) problems.push("empty reason");
  if (mustAnswer && refused) problems.push(`REFUSED despite sufficient input (error=${out.body?.error ?? "-"})`);
  if (!mustAnswer && !refused) problems.push("answered an unanswerable request");
  if (problems.length) {
    fail++;
    console.log(`FAIL  ${ep}  ${JSON.stringify(params).slice(0, 100)}`);
    console.log(`      ${problems.join("; ")}  [${out.ms}ms]`);
    console.log(`      reason: ${reason.slice(0, 160)}`);
  } else { pass++; console.log(`ok    ${ep}  ${JSON.stringify(params).slice(0, 78)}  [${out.ms}ms]`); }
}

console.log(`\nsubject survives a paraphrasing query\n`);
for (const [ep, params, mustMention] of SUBJECTS) {
  let out;
  try { out = await call(ep, params); }
  catch (e) { fail++; console.log(`FAIL  ${ep}\n      transport: ${e.message}`); continue; }
  const reason = typeof out.body?.reason === "string" ? out.body.reason : "";
  const ok = out.status === 200 && reason.trim() && new RegExp(mustMention, "i").test(reason) && !out.body?.error;
  if (!ok) {
    fail++;
    console.log(`FAIL  ${ep}  want /${mustMention}/  error=${out.body?.error ?? "-"}`);
    console.log(`      got: ${reason.slice(0, 180)}`);
  } else { pass++; console.log(`ok    ${ep}  [${out.ms}ms]`); }
}

console.log(`\n${pass} passed, ${fail} failed, ${SHAPES.length + SUBJECTS.length} total`);
process.exit(fail ? 1 : 0);
