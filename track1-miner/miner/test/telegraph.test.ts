import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { answerTelegraph } from "../src/telegraph";

describe("answerTelegraph", () => {
  test("reads live protocol state rather than reciting it (live)", async () => {
    const r = await answerTelegraph("How many miners are registered on Telegraph?");
    assert.match(r.reason, /\d+ miners are currently registered|currently \d+ miners registered/);
    assert.match(r.source, /live/i);
    assert.ok(r.confidence >= 0.8);
  });

  test("answers a named intent with its current miner count (live)", async () => {
    const r = await answerTelegraph("How many miners serve SSL_VERIFICATION?");
    assert.match(r.reason, /SSL_VERIFICATION/);
    assert.match(r.reason, /\d+ registered\s+miners/);
  });

  test("answers a stable protocol fact from the verified record", async () => {
    const r = await answerTelegraph("How do I register a miner on Telegraph?");
    assert.equal(r.topic, "miner registration");
    assert.match(r.reason, /YAML manifest/);
    assert.match(r.reason, /SHA-256|hash/);
  });

  /**
   * The defect this locks out. Until 2026-09-04 the fact table covered seven
   * narrow topics, so "What is Telegraph Protocol?" — the plainest question in
   * the intent — answered `not_covered`, as did 20 of these 34. A refusal scores
   * ~1.3e-11 against champion 2104 where an answer crosses to 1.0, which is
   * exactly the 1.0/~0 alternation TELEGRAPH_KNOWLEDGE showed across epochs
   * 298-308. Every question here sits inside the canonical intent description.
   */
  test("answers the core questions of the intent rather than refusing them", async () => {
    const core = [
      "What is Telegraph Protocol?", "What is an intent in Telegraph?",
      "How are miners ranked on Telegraph?", "How long is a Telegraph epoch?",
      "How do miners earn money on Telegraph?", "What happens if a Telegraph miner goes offline?",
      "How does scoring work on Telegraph?", "What is the grace period for a new Telegraph miner?",
      "How do I register a miner on Telegraph?", "What is the Telegraph Explorer?",
      "What blockchain does Telegraph use?", "Can I update a Telegraph miner after registering it?",
      "What are the Telegraph hackathon tracks?", "What is Alexandria?",
      "What is the Miner YAML Registry?", "Explain me what is telegraph",
      "What can you do?", "Who are you?", "What is MACHINA?", "What is a signal hash?",
      "What is the Telegraph Daemon?", "How much does a Telegraph query cost?",
      "What is x402 and how does Telegraph use it?", "What is a WASM scoring module?",
      "How do I build an app on Telegraph?", "What is Telegraph's tokenomics?",
      "Where is Telegraph's documentation?", "What is a subnet in Telegraph?",
      // Added 2026-09-08 (GAPS G71): consumer surfaces that were verified in
      // docs/TELEGRAPH_FACTS.md but never served.
      "What is the Telegraph MCP server?", "How do I call a specific miner directly?",
      "How do I subscribe to signals over WebSocket?", "How do I verify a signal I paid for?",
      "Which reference applications has Telegraph built?", "What do validators do on Telegraph?",
      "Where are the Telegraph docs?", "What is the miner dispatcher?",
      "How much USDC do I need in escrow?", "What tools does the MCP server expose?",
    ];
    const refused: string[] = [];
    for (const q of core) {
      const r = await answerTelegraph(q, 6000);
      if (r.verdict === "not_covered") refused.push(q);
    }
    assert.deepEqual(refused, [], `refused questions inside the intent: ${refused.join(" | ")}`);
  });

  /** Ordering: "registering" in an update question must not claim it for registration. */
  test("routes each question to the topic it is actually about", async () => {
    const cases: Array<[string, string]> = [
      ["Can I update a Telegraph miner after registering it?", "updating"],
      ["What happens if a Telegraph miner goes offline?", "spot checks"],
      ["How do I register a miner on Telegraph?", "miner registration"],
      ["How long is a Telegraph epoch?", "epochs"],
      // The 2026-09-08 entries sit after every earlier one, so what those
      // answered before they must still answer, in the same words.
      ["What is a signal hash?", "daemon"],
      ["What is MACHINA?", "economics"],
      ["What is Telegraph Protocol?", "telegraph"],
      ["What is the Telegraph Explorer?", "explorer"],
      ["What blockchain does Telegraph use?", "contract"],
      ["What is an intent in Telegraph?", "intents"],
      // And the new ones take only what used to fall through.
      ["What is the Telegraph MCP server?", "mcp"],
      ["How do I call a specific miner directly?", "direct calls"],
      ["What is a subnet in Telegraph?", "direct calls"],
      ["How do I connect to the Telegraph WebSocket?", "websocket"],
      // "subscribe to signals over WebSocket" keeps its earlier daemon route; see the stability test.
      ["How do I subscribe to signals over WebSocket?", "daemon"],
      ["What is x402 and how does Telegraph use it?", "x402"],
      ["How do I build an app on Telegraph?", "applications"],
      ["What do validators do on Telegraph?", "validators"],
      ["Where is Telegraph's documentation?", "documentation"],
    ];
    for (const [q, topic] of cases) {
      assert.equal((await answerTelegraph(q, 6000)).topic, topic, q);
    }
  });

  /**
   * Route stability, pinned 2026-09-08 when seven entries were added (GAPS G71).
   * Every question below was answered by a SPECIFIC entry before the change and
   * must still be, by the same entry: a stolen route would turn an answer the
   * scorer may already accept into a different one. The list was generated by
   * running the committed table (git HEAD before the change) over 96
   * questions; only questions that used to fall to the generic catch-all or to
   * not_covered were allowed to move.
   */
  test("the entries added on 2026-09-08 take nothing from an existing specific entry", async () => {
    const pinned: Array<[string, string]> = [
      ["What is an intent in Telegraph?", "intents"],
      ["How are miners ranked on Telegraph?", "routing"],
      ["How long is a Telegraph epoch?", "epochs"],
      ["How do miners earn money on Telegraph?", "economics"],
      ["What happens if a Telegraph miner goes offline?", "spot checks"],
      ["How does scoring work on Telegraph?", "scoring"],
      ["What is the grace period for a new Telegraph miner?", "grace period"],
      ["How do I register a miner on Telegraph?", "miner registration"],
      ["What is the Telegraph Explorer?", "explorer"],
      ["What blockchain does Telegraph use?", "contract"],
      ["Can I update a Telegraph miner after registering it?", "updating"],
      ["What are the Telegraph hackathon tracks?", "hackathon"],
      ["What is Alexandria?", "alexandria"],
      ["What is the Miner YAML Registry?", "miner registration"],
      ["What is MACHINA?", "economics"],
      ["What is a signal hash?", "daemon"],
      ["What is the Telegraph Daemon?", "daemon"],
      ["How much does a Telegraph query cost?", "economics"],
      ["What is a WASM scoring module?", "scoring"],
      ["How do I subscribe to signals over WebSocket?", "daemon"],
      ["How do I verify a signal I paid for?", "daemon"],
      ["How much USDC do I need in escrow?", "economics"],
      ["How do I pay for a Telegraph query?", "economics"],
      ["What is the canonical score?", "scoring"],
      ["What is the Diamond contract?", "contract"],
      ["How do spot checks work?", "spot checks"],
      ["How do I get an API key for my miner?", "identity"],
      ["What happens if my miner is rejected?", "activation"],
      ["What is the fee address?", "economics"],
      ["How many intents are there?", "intents"],
      ["What is the price of a query?", "economics"],
      ["What is the MACHINA token?", "economics"],
      ["How is my miner ranked?", "routing"],
      ["What is routing revocation?", "routing"],
      ["What is a canonical intent?", "intents"],
      ["How do I deregister a miner?", "activation"],
      ["What is the explorer leaderboard?", "explorer"],
      ["How do I get testnet USDC?", "economics"],
      ["What is a scoring module?", "scoring"],
      ["Who scores the answers on Telegraph?", "scoring"],
      ["What is a spot check?", "spot checks"],
      ["What does a Telegraph miner earn per request?", "economics"],
      ["What is the Telegraph hackathon?", "hackathon"],
      ["What is a Telegraph signal?", "daemon"],
      ["How do I integrate Telegraph into my app?", "miner registration"],
      ["Which website should I use to register?", "miner registration"],
      ["Do validators on Ethereum get slashed?", "spot checks"],
      ["Route the following request to only Degens Miner", "routing"],
      ["Would a browser throw a warning if I opened revoked.badssl.com right now, and why?", "spot checks"],
      ["Research morpho in the context of this decision: \"I want to deposit 500 USDC into Morpho on Base via https://app.morpho.org. Should I proceed?\". Report anything that would make executing this action unsafe.", "economics"],
    ];
    for (const [q, topic] of pinned) {
      assert.equal((await answerTelegraph(q, 6000)).topic, topic, q);
    }
  });

  test("questions the generic catch-all used to answer now get the entry about their subject", async () => {
    const moved: Array<[string, string]> = [
      ["What is x402 and how does Telegraph use it?", "x402"],
      ["How do I build an app on Telegraph?", "applications"],
      ["Where is Telegraph's documentation?", "documentation"],
      ["What is a subnet in Telegraph?", "direct calls"],
      ["What is the Telegraph MCP server?", "mcp"],
      ["How do I call a specific miner directly?", "direct calls"],
      ["Which reference applications has Telegraph built?", "applications"],
      ["What do validators do on Telegraph?", "validators"],
      ["Where are the Telegraph docs?", "documentation"],
      ["What is the miner dispatcher?", "direct calls"],
      ["Where do I find the miner catalog?", "documentation"],
      ["What is a Telegraph node?", "validators"],
      ["How do I get started with Telegraph?", "documentation"],
    ];
    for (const [q, topic] of moved) {
      assert.equal((await answerTelegraph(q, 6000)).topic, topic, q);
    }
  });

  /**
   * The Daemon routes open-domain questions here by mistake (G71). The new
   * entries carry broad words — docs, website, nodes, subscribe — so each one
   * also requires a Telegraph word in the question. These stay refused.
   */
  test("off-topic questions are still refused, not answered with Telegraph facts", async () => {
    const offTopic = [
      "What is TruthWire?",
      "What is the engine?",
      "Will the website go down tomorrow?",
      "Where can I read the docs for React?",
      "Will Jane Street respond to the published solution?",
      "Will Vance call for war with Iran?",
      "Will the Jane Street challenge solution be open-sourced?",
      "Can AI design circuit boards?",
      "Will Novartis halt NCT06247995?",
      "Is the OpenAI board independent from the company?",
      "Will Meta fire the executive?",
      "Will GPT-6 Astra beat DeepMind Orion?",
      "Will the Jane Street challenge be solved this year?",
      "Will Fresenius Medical Care Deutschland GmbH complete paediatric treatments trial?",
      "Will new ID verification security standards emerge?",
      "Will RINVOQ get FDA safety review?",
      "Will .name domain service terminate?",
      "Will the hacked ID verification companies face lawsuits?",
      "Will Project Xanadu reach 200 HN points?",
      "Will K2 Horizon launch before December?",
      "Which operator had the highest inbound flow this week?",
      "Research BTC in the context of this decision: \"Should I buy BTC right now given current market conditions?\". Report anything that would make executing this action unsafe.",
    ];
    for (const q of offTopic) {
      assert.equal((await answerTelegraph(q, 6000)).verdict, "not_covered", q);
    }
  });

  test("declines what it cannot source, instead of inventing it", async () => {
    // The failure this project refuses everywhere else: a confident answer to
    // something we have no basis for.
    const r = await answerTelegraph("What is the airspeed velocity of an unladen swallow?");
    assert.equal(r.verdict, "not_covered");
    assert.match(r.reason, /docs\.telegraphprotocol\.com/);
  });

  test("an empty question is refused honestly", async () => {
    const r = await answerTelegraph("");
    assert.equal(r.error, "invalid_input");
  });
});
