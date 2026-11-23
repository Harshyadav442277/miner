// Probe the four routes on a base URL: time, status, scored fields.
const base = process.argv[2] || "https://miner-wine.vercel.app";
const cases = [
  ["/research", { query: "Does intermittent fasting improve insulin sensitivity?" }],
  ["/research", { query: "What is the effect of microplastics on human health?" }],
  ["/research", { query: "How effective are mRNA vaccines against COVID-19 hospitalization?" }],
  ["/research", { query: "What are the main causes of coral reef bleaching?" }],
  ["/web-search", { query: "Who won the 2024 Nobel Prize in Physics?" }],
  ["/web-search", { query: "What is the latest stable version of Python?" }],
  ["/web-search", { query: "capital of Australia" }],
  ["/web-search", { query: "Ethereum Pectra upgrade date" }],
  ["/event-outcome", { event: "Did Donald Trump win the 2024 US presidential election?" }],
  ["/event-outcome", { event: "Will Bitcoin reach $150,000 by December 31, 2026?" }],
  ["/event-outcome", { event: "Did Real Madrid win the 2024 UEFA Champions League final?" }],
  ["/event-outcome", { event: "Did the Federal Reserve cut interest rates in September 2024?" }],
  ["/chat", { message: "Explain the difference between TCP and UDP in two sentences." }],
  ["/chat", { message: "Will it rain on Mars tomorrow?" }],
];
(async () => {
  for (const [p, q] of cases) {
    const t = Date.now();
    let out;
    try {
      const r = await fetch(`${base}${p}?${new URLSearchParams(q)}`, { signal: AbortSignal.timeout(30_000) });
      const j = await r.json();
      out = { s: r.status, ms: Date.now() - t, verdict: j.verdict, outcome: j.outcome, resolved_yes: j.resolved_yes, brief: j.brief, err: j.error, ans: String(j.answer ?? j.reply ?? "").slice(0, 140) };
    } catch (e) { out = { ms: Date.now() - t, fail: String(e) }; }
    console.log(p, JSON.stringify(Object.values(q)[0]).slice(0, 70), "\n   ", JSON.stringify(out));
  }
})();
