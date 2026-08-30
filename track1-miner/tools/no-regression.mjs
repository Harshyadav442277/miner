/**
 * withSubject must be a NO-OP on a verbatim question.
 *
 * The scored surface of five intents we lead depends on the exact prose we
 * return. The change only appends the declared subject when it is ABSENT from
 * the question, so sending the subject parameter alongside a question that
 * already names it must produce a byte-identical answer.
 *
 * Compared against production, not against a local build.
 *
 * KNOWN AND DELIBERATE: /ip-geolocate DIFFERS and is left alone — see GAPS G35.
 * It is the only route that reuses its subject parameter as the question it
 * restates, so filling `ip` costs it the restatement prefix. That is a real
 * inconsistency, but IP_GEOLOCATION is rank 1 by 0.1% and already scores above
 * the cliff, so it is recorded rather than "fixed" blind. Expect 7 identical,
 * 1 differing until that experiment is run.
 */
const BASE = process.argv[2] ?? "https://miner-wine.vercel.app";
const ADDR = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

// [endpoint, verbatim question, the declared params the engine would also fill]
const CASES = [
  ["/ssl-check", "Is the SSL certificate for github.com valid?", { domain: "github.com" }],
  ["/storm-alert", "Is there a storm risk in Chennai over the next 48 hours?", { location: "Chennai" }],
  ["/weather-forecast", "What is the weather forecast for London over the next 24 hours?", { location: "London" }],
  ["/ip-geolocate", "Where is 8.8.8.8 located and does it have any abuse history?", { ip: "8.8.8.8" }],
  ["/papers", "Find recent peer-reviewed papers on CRISPR gene editing", { topic: "CRISPR gene editing" }],
  ["/ai-detect", "Was this written by AI? The rapid proliferation of artificial intelligence has fundamentally transformed numerous sectors across the global economy. Moreover, it is important to note that these developments continue to accelerate at an unprecedented pace, reshaping how organisations approach strategic planning and operational efficiency in ways previously unimaginable.", {}],
  ["/extract", 'Extract the contact details from: "Reach us at support@example.com or call 555-0192."', { text: "Reach us at support@example.com or call 555-0192." }],
  ["/wallet-balance", `What is the ETH balance of ${ADDR}?`, { address: ADDR }],
];

/** Fields that legitimately differ between two calls seconds apart. */
const VOLATILE = new Set(["checked_at", "as_of", "retrieved_at", "published", "uptime_s"]);
function stable(o) {
  if (Array.isArray(o)) return o.map(stable);
  if (o && typeof o === "object") {
    return Object.fromEntries(
      Object.entries(o).filter(([k]) => !VOLATILE.has(k)).map(([k, v]) => [k, stable(v)]),
    );
  }
  return o;
}

const get = async (ep, params) => {
  const u = new URL(BASE + ep);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
  return r.json();
};

let fail = 0;
for (const [ep, question, declared] of CASES) {
  // Warm both through the same 60s cache entry so a live upstream change
  // between the two calls cannot masquerade as a routing difference.
  const withoutP = await get(ep, { query: question });
  const withP = await get(ep, { query: question, ...declared });
  const a = JSON.stringify(stable(withoutP));
  const b = JSON.stringify(stable(withP));
  if (a === b) console.log(`identical  ${ep}`);
  else {
    fail++;
    console.log(`DIFFERS    ${ep}`);
    console.log(`   without: ${a.slice(0, 200)}`);
    console.log(`   with:    ${b.slice(0, 200)}`);
  }
}
console.log(`\n${CASES.length - fail} identical, ${fail} differ`);
process.exit(fail ? 1 : 0);
