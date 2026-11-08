import { test } from "node:test";
import assert from "node:assert/strict";
import {
  asksWillHappen, auditContract, chat, cut, generateText, normaliseAuditFindings, normaliseFindings, opening, parseObject, reviewCode, reviewSummary,
  reviewVerdict, riskGrade, wordTarget, writeBrief, writeTitle, type AuditFinding,
} from "../src/genai";
import { resetPhraseState } from "../src/llm";

/** Groq answering with `content` for every call; restores fetch and the key after. */
async function withModel(content: string | null, run: (calls: Array<Record<string, unknown>>) => Promise<void>): Promise<void> {
  const real = globalThis.fetch;
  const calls: Array<Record<string, unknown>> = [];
  process.env.GROQ_API_KEY = "test-key";
  resetPhraseState();
  globalThis.fetch = (async (_url: string, init: { body: string }) => {
    calls.push(JSON.parse(init.body) as Record<string, unknown>);
    if (content === null) return new Response("{}", { status: 429 });
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
  }) as typeof fetch;
  try {
    await run(calls);
  } finally {
    globalThis.fetch = real;
    delete process.env.GROQ_API_KEY;
    resetPhraseState();
  }
}

test("genai: helpers parse JSON, cut to 80 characters and read word targets", () => {
  assert.deepEqual(parseObject('noise {"a": 1} tail'), { a: 1 });
  assert.equal(parseObject("not json"), null);
  assert.equal(cut("short"), "short");
  const long = cut("The quick brown fox jumps over the lazy dog and keeps running far beyond the hill until night falls.");
  assert.ok(long.length <= 80, long);
  assert.equal(opening("First one. Second one."), "First one.");
  // Production, 2026-11-07: the old cut served "… breaking into smaller copies of."
  // A truncated phrase is marked "…", never ended with "." as if it were a sentence (2026-11-08).
  assert.equal(cut("Recursion is when a problem solves itself by breaking into smaller copies of itself until it is simple."),
    "Recursion is when a problem solves itself by breaking into smaller copies…");
  // A clause boundary under 60 characters is not taken: the 48-character clause read as the whole answer.
  assert.equal(cut("Recursion is like a set of Russian nesting dolls: each doll contains a smaller doll that looks just like the one before."),
    "Recursion is like a set of Russian nesting dolls: each doll contains a smaller…");
  // One at 60 or later is, and ends as a sentence.
  assert.equal(cut("Bitcoin traded near its record this week, as spot ETF inflows rose, while miners sold coins to fund new rigs today."),
    "Bitcoin traded near its record this week, as spot ETF inflows rose.");
  assert.equal(wordTarget("Write a 60-word product description"), 60);
  assert.equal(wordTarget("Summarise in 120 words"), 120);
  assert.equal(wordTarget("Write a haiku"), null);
  assert.equal(asksWillHappen("Will Bitcoin pass $200k in 2027?"), true);
  assert.equal(asksWillHappen("Why is the sky blue?"), false);
});

test("genai: a critical or high finding is never approved, and findings sort by severity", () => {
  const f = normaliseFindings([
    { severity: "low", issue: "naming" },
    { severity: "CRITICAL", line: 2, issue: "SQL injection", fix: "parameterise" },
    { severity: "bogus", issue: "x" },
    { severity: "high" },
  ]);
  assert.deepEqual(f.map((x) => x.severity), ["critical", "low", "info"]);
  assert.equal(f[0]!.line, 2);
  assert.equal(reviewVerdict("Approve", f), "Request changes");
  assert.equal(reviewVerdict("Approve", [{ severity: "medium", line: null, issue: "a", fix: "" }]), "Comment");
  assert.equal(reviewVerdict("nonsense", []), "Approve");
});

test("genai: chat serves brief, reply and a will-verdict from the model's JSON", async () => {
  await withModel(JSON.stringify({ brief: "Unlikely: no crewed Mars lander is scheduled before 2030 by any agency.", reply: "Unlikely: no crewed Mars lander is scheduled before 2030 by any agency. NASA's plans point to the late 2030s.", verdict: "Unlikely" }), async (calls) => {
    const a = await chat("Will humans land on Mars by 2030?");
    assert.equal(a.verdict, "Unlikely");
    assert.ok(String(a.brief).length <= 80);
    assert.match(String(a.reason), /^Unlikely: no crewed Mars lander/);
    assert.equal((calls[0]!.response_format as { type: string }).type, "json_object");
    assert.equal(calls[0]!.model, "openai/gpt-oss-120b");
  });
  await withModel(JSON.stringify({ brief: "Canberra is the capital of Australia.", reply: "Canberra is the capital of Australia.", verdict: null }), async () => {
    const a = await chat("", "What is the capital of Australia?");
    // The schema's verdict enum is Likely | Unlikely | Uncertain: a non-forecast answer carries none.
    assert.equal("verdict" in a, false);
    assert.equal(a.brief, "Canberra is the capital of Australia.");
  });
});

test("genai: a one-word forecast brief falls back to the reply's opening sentence, and hyphens are plain", async () => {
  // Production shape, 2026-11-08: brief "Uncertain" alone on a forecast question.
  await withModel(JSON.stringify({ brief: "Uncertain", verdict: "Uncertain",
    reply: "Uncertain: the Fed‑funds path depends on 2027 inflation, which sits near −1 point of target. Markets price two cuts." }), async () => {
    const a = await chat("Will the Fed cut rates in 2027?");
    assert.equal(a.verdict, "Uncertain");
    assert.match(String(a.brief), /^Uncertain: the Fed-funds path depends on 2027 inflation\b/);
    assert.ok(String(a.brief).length <= 80);
    assert.doesNotMatch(String(a.reply), /[‐‑−]/);
  });
  await withModel(JSON.stringify({ brief: "Likely.", verdict: "Likely", reply: "Likely. Launch windows open in 2027." }), async () => {
    assert.equal((await chat("Will a Mars launch happen in 2027?")).brief, "Likely.");
  });
});

test("genai: no model answer is unknown, never invented; empty input is refused by name", async () => {
  await withModel(null, async () => {
    const a = await chat("Why is the sky blue?");
    assert.equal(a.verdict, "unknown");
    assert.equal(a.error, "upstream_unavailable");
    assert.equal(a.reply, null);
  });
  assert.equal((await reviewCode("")).error, "no_code");
  assert.equal((await reviewCode("https://github.com/x/y/pull/1")).error, "link_not_fetched");
  assert.equal((await generateText("  ")).error, "no_prompt");
});

test("genai: a review's verdict follows its findings and leads the answer", async () => {
  const model = { verdict: "Approve", summary: "The code is unsafe: it builds SQL from input.", findings: [
    { severity: "high", line: 4, issue: "Off-by-one: range(len(rows) + 1) reads past the end.", fix: "for row in rows:" },
    { severity: "critical", line: 2, issue: "SQL injection: uid is concatenated into the query.", fix: "Use a parameterised query." },
  ] };
  await withModel(JSON.stringify(model), async () => {
    const a = await reviewCode("", "def f(db, uid):\n  q = 'SELECT * FROM users WHERE id = ' + uid\n");
    assert.equal(a.verdict, "Request changes");
    assert.equal(a.finding_count, 2);
    assert.equal((a.findings as Array<{ severity: string }>)[0]!.severity, "critical");
    // A summary without the correctness opener gets the one its verdict supports.
    assert.match(String(a.reason), /^Request changes: The code is not correct\. The code is unsafe/);
  });
});

test("genai: the review summary opens with its correctness sentence and asks for 3-6 sentences", async () => {
  assert.equal(reviewSummary("The code is correct. A buffer overflow at line 3.", "Request changes"), "The code is not correct. A buffer overflow at line 3.");
  assert.equal(reviewSummary("The code is correct. Names are clear.", "Approve"), "The code is correct. Names are clear.");
  assert.equal(reviewSummary("Clean and readable.", "Approve"), "The code is correct. Clean and readable.");
  assert.equal(reviewSummary("One medium issue.", "Comment"), "One medium issue.");
  await withModel(JSON.stringify({ verdict: "Approve", summary: "The code is correct. It sums a list.", findings: [] }), async (calls) => {
    await reviewCode("", "def total(xs):\n  return sum(xs)\n");
    assert.match(String((calls[0]!.messages as Array<{ content: string }>)[0]!.content), /three to six plain sentences that open with exactly "The code is correct\." or "The code is not correct\."/);
  });
});

const VAULT = `pragma solidity ^0.8.0;
contract Vault {
  mapping(address => uint) public balances;
  function deposit() external payable { balances[msg.sender] += msg.value; }
  function withdraw() external {
    uint amount = balances[msg.sender];
    (bool ok, ) = msg.sender.call{value: amount}("");
    require(ok);
    balances[msg.sender] = 0;
  }
}`;

test("audit: a planted reentrancy is graded by its finding, and the summary opens with that grade", async () => {
  const model = { verdict: "High", summary: "Overall risk is High. withdraw sends ETH before zeroing the balance.", findings: [
    { class: "Access control", function: "deposit", severity: "low", issue: "No event is emitted.", fix: "Emit Deposit." },
    { class: "Reentrancy", function: "withdraw()", severity: "critical", issue: "The external call runs before balances[msg.sender] = 0, so a fallback re-enters and drains the vault.", fix: "Set the balance to 0 before the call, or use ReentrancyGuard." },
  ] };
  await withModel(JSON.stringify(model), async (calls) => {
    const a = await auditContract("", VAULT);
    assert.equal(a.verdict, "Critical", "the grade follows the most serious finding, not the stated one");
    assert.equal(a.finding_count, 2);
    const f = a.findings as AuditFinding[];
    assert.deepEqual([f[0]!.class, f[0]!.function, f[0]!.severity], ["reentrancy", "withdraw", "critical"]);
    assert.match(String(a.summary), /^Overall risk: Critical\. withdraw sends ETH/);
    assert.match(String((calls[0]!.messages as Array<{ content: string }>)[0]!.content), /^You are a smart-contract security auditor\./);
    assert.equal(calls[0]!.model, "openai/gpt-oss-120b");
  });
});

test("audit: a safe contract is No issues found, and links, addresses and empty input are refused", async () => {
  await withModel(JSON.stringify({ verdict: "Low", summary: "The contract is safe: it only stores a number.", findings: [] }), async () => {
    const a = await auditContract("Audit: pragma solidity ^0.8.0; contract S { uint x; function set(uint v) external { x = v; } }");
    assert.equal(a.verdict, "No issues found");
    assert.match(String(a.summary), /^Overall risk: No issues found\. The contract is safe/);
  });
  assert.equal(riskGrade([]), "No issues found");
  assert.equal(normaliseAuditFindings([{ severity: "bogus", issue: "x" }])[0]!.severity, "info");
  assert.equal((await auditContract("")).error, "no_contract");
  assert.equal((await auditContract("", "0x1234567890abcdef1234567890abcdef12345678")).error, "source_not_fetched");
  assert.equal((await auditContract("https://etherscan.io/address/0x1")).error, "source_not_fetched");
});

test("llm: a 400 moves to the next model at once, and a json_validate_failed generation is kept when it parses", async () => {
  const real = globalThis.fetch;
  const models: string[] = [];
  let salvageable = true;
  process.env.GROQ_API_KEY = "test-key";
  resetPhraseState();
  const review = { verdict: "Approve", summary: "The code is correct. It sums a list.", findings: [] };
  globalThis.fetch = (async (_url: string, init: { body: string }) => {
    const model = String((JSON.parse(init.body) as { model: string }).model);
    models.push(model);
    if (model === "openai/gpt-oss-120b") {
      return new Response(JSON.stringify({ error: { code: "json_validate_failed", message: "Failed to generate JSON",
        failed_generation: salvageable ? `Here is the review: ${JSON.stringify(review)}` : "not json at all" } }), { status: 400 });
    }
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(review) } }] }), { status: 200 });
  }) as typeof fetch;
  try {
    const a = await reviewCode("", "def total(xs):\n  return sum(xs)\n");
    assert.equal(a.verdict, "Approve");
    assert.deepEqual(models, ["openai/gpt-oss-120b"], "the paid-for generation is used, no second model");
    salvageable = false;
    models.length = 0;
    resetPhraseState();
    const t0 = Date.now();
    const b = await reviewCode("", "def total(xs):\n  return sum(xs)\n");
    assert.equal(b.verdict, "Approve");
    assert.deepEqual(models, ["openai/gpt-oss-120b", "qwen/qwen3.8-27b"]);
    assert.ok(Date.now() - t0 < 1_000, "no wait between a 400 and the next model");
  } finally {
    globalThis.fetch = real;
    delete process.env.GROQ_API_KEY;
    resetPhraseState();
  }
});

test("genai: long calls are budgeted by tokens and their rate limits never park the phrasing path", async () => {
  process.env.LLM_LONG_TOKENS_PER_MIN = "2500"; // one writing call (~2,000 tokens) fits, a second does not
  try {
    await withModel(JSON.stringify({ title: "", text: "One." }), async (calls) => {
      await generateText("", "Write one word.");
      const second = await generateText("", "Write two words.");
      assert.equal(second.error, "upstream_unavailable");
      assert.equal(calls.length, 1, "the capped call must not reach the model");
      const again = await generateText("", "Write one word."); // a cached answer is still served
      assert.equal(again.verdict, "generated");
    });
  } finally {
    delete process.env.LLM_LONG_TOKENS_PER_MIN;
  }
  // Every model answering 429 to a long call sets the long cooldown only.
  await withModel(null, async () => {
    await chat("Why is the sky blue?");
  });
  const { phrase } = await import("../src/llm");
  process.env.GROQ_API_KEY = "test-key";
  const real = globalThis.fetch;
  let rate = true;
  globalThis.fetch = (async () => (rate
    ? new Response("{}", { status: 429 })
    : new Response(JSON.stringify({ choices: [{ message: { content: "Phrased." } }] }), { status: 200 }))) as typeof fetch;
  try {
    await chat("Why is the sky blue?"); // trips the long cooldown
    rate = false;
    assert.equal(await phrase({ system: "s", user: "u" }), "Phrased.", "the phrasing path must not be parked by a long call");
    assert.equal((await chat("Why is grass green?")).error, "upstream_unavailable", "the long path is parked for its minute");
  } finally {
    globalThis.fetch = real;
    delete process.env.GROQ_API_KEY;
    resetPhraseState();
  }
});

test("genai: the token estimate counts non-ASCII characters whole, and every fallback attempt is charged", async () => {
  const { estimateTokens } = await import("../src/llm");
  assert.equal(estimateTokens({ system: "", user: "abcdefgh", maxTokens: 10 }), 12);
  assert.equal(estimateTokens({ system: "", user: "日本語のテキスト", maxTokens: 10 }), 18);
  // Three timed-out-style failures (HTTP 500 counts as a rate refusal) each spend the budget.
  process.env.LLM_LONG_TOKENS_PER_MIN = "2000"; // one chat attempt (~900 tokens) twice, not three times
  try {
    await withModel(null, async (calls) => {
      await chat("Why is the sky blue?");
      assert.equal(calls.length, 2, "the third attempt is over budget");
    });
  } finally {
    delete process.env.LLM_LONG_TOKENS_PER_MIN;
  }
});

test("genai: generated text always has a title, and a multi-line text's brief is its first line", async () => {
  assert.equal(writeTitle("", "Charge anywhere with sunlight. More."), "Charge anywhere with sunlight");
  assert.equal(writeTitle("**Sun Charger**", "x"), "Sun Charger");
  assert.equal(writeBrief("Autumn moonlight\na worm digs silently\ninto the chestnut."), "Autumn moonlight");
  assert.equal(writeBrief("Ode to Rain\n\nThe rain comes soft at dusk\nand leaves by dawn.", "Ode to Rain"), "The rain comes soft at dusk");
  assert.equal(writeBrief("Short single line."), "Short single line.");
  await withModel(JSON.stringify({ title: "", text: "Autumn moonlight\na worm digs silently\ninto the chestnut." }), async (calls) => {
    const a = await generateText("", "Write a haiku about autumn.");
    assert.equal(a.title, "Autumn moonlight");
    assert.equal(a.brief, "Autumn moonlight");
    assert.match(String((calls[0]!.messages as Array<{ content: string }>)[0]!.content), /"title": a short title for the piece in at most eight words, always given/);
  });
});

test("genai: generated text carries brief, word count and the requested count", async () => {
  const text = "Charge anywhere with sunlight. " + "Word ".repeat(55).trim() + ".";
  await withModel(JSON.stringify({ title: "", text }), async () => {
    const a = await generateText("", "Write a 60-word product description for a solar charger.");
    assert.equal(a.verdict, "generated");
    assert.equal(a.requested_words, 60);
    assert.equal(a.word_count, 59);
    assert.equal(a.brief, "Charge anywhere with sunlight.");
    assert.equal(a.reason, text);
  });
});

test("genai: every model reply gets plain hyphens before it is cleaned", async () => {
  const { plainHyphens } = await import("../src/llm");
  assert.equal(plainHyphens("off\u2011by\u2011one and Musk\u2010backed"), "off-by-one and Musk-backed");
  assert.equal(plainHyphens("a \u2212 b"), "a \u2212 b", "a minus sign is not a hyphen");
});
