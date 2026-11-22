import { test } from "node:test";
import assert from "node:assert/strict";
import {
  headerFindings, issueId, looksLikeCode, looksLikeConfig, osvSeverity, parseCodeReview, parsePackages, securityReview, siteOf, verdictOf,
} from "../src/securityreview";
import { scoredFields } from "../src/intent-fields";
import { resetPhraseState } from "../src/llm";

test("parsePackages: each ecosystem's own spelling, explicit ecosystems first", () => {
  assert.deepEqual(parsePackages("Is lodash@4.17.15 secure?"), [{ ecosystem: "npm", name: "lodash", version: "4.17.15" }]);
  assert.deepEqual(parsePackages("review requests==2.19.0 and flask==0.12"), [
    { ecosystem: "PyPI", name: "requests", version: "2.19.0" }, { ecosystem: "PyPI", name: "flask", version: "0.12" }]);
  assert.deepEqual(parsePackages("org.apache.logging.log4j:log4j-core:2.14.1"), [{ ecosystem: "Maven", name: "org.apache.logging.log4j:log4j-core", version: "2.14.1" }]);
  assert.deepEqual(parsePackages("github.com/gin-gonic/gin@v1.6.0"), [{ ecosystem: "Go", name: "github.com/gin-gonic/gin", version: "1.6.0" }]);
  assert.deepEqual(parsePackages("@babel/traverse@7.22.0"), [{ ecosystem: "npm", name: "@babel/traverse", version: "7.22.0" }]);
  assert.deepEqual(parsePackages('{"dependencies": {"minimist": "^1.2.0"}}'), [{ ecosystem: "npm", name: "minimist", version: "1.2.0" }]);
  assert.deepEqual(parsePackages("pypi: django 2.2.0"), [{ ecosystem: "PyPI", name: "django", version: "2.2.0" }]);
  assert.deepEqual(parsePackages("email me at admin@example.com"), [], "an e-mail address is not a package");
  assert.deepEqual(parsePackages("Is lodash secure?"), [], "no version, nothing to look up");
});

test("siteOf, looksLikeCode", () => {
  assert.equal(siteOf("example.com")?.href, "https://example.com/");
  assert.equal(siteOf("https://shop.example.org/login")?.hostname, "shop.example.org");
  assert.equal(siteOf("Review the site example.com")?.hostname, "example.com");
  assert.equal(siteOf("lodash@4.17.15"), null);
  assert.equal(looksLikeCode("const q = `SELECT * FROM users WHERE id = ${id}`; db.query(q);"), true);
  assert.equal(looksLikeCode("Is lodash safe to use?"), false);
  // Production 2026-11-16: refused as no target, though both are the textbook XSS and path traversal.
  assert.equal(looksLikeCode("app.get('/hello', (req, res) => { res.send('<h1>Hello ' + req.query.name + '</h1>'); });"), true);
  assert.equal(looksLikeCode("app.get('/file', (req, res) => { res.sendFile('/srv/files/' + req.query.name); });"), true);
  assert.equal(looksLikeCode("Is lodash@4.17.15 (the latest) secure?"), false);
  // A long run of word characters and parentheses must not make detection slow.
  const t0 = Date.now();
  looksLikeCode(`{${"a".repeat(200_000)}`);
  looksLikeCode(`;${"a(".repeat(50_000)}`);
  looksLikeConfig(`${"k=v\n".repeat(50_000)}`);
  assert.ok(Date.now() - t0 < 300, `detection took ${Date.now() - t0} ms`);
});

test("configuration counts as reviewable code; a repository link is not a site", async () => {
  const { looksLikeConfig, isRepoLink } = await import("../src/securityreview");
  assert.equal(looksLikeConfig("FROM node:14\nRUN npm install\nCMD [\"node\", \"server.js\"]"), true, "Dockerfile");
  assert.equal(looksLikeConfig("apiVersion: v1\nkind: Pod\nspec:\n  containers:\n    - name: app"), true, "Kubernetes");
  assert.equal(looksLikeConfig("services:\n  db:\n    image: postgres:12"), true, "Compose");
  assert.equal(looksLikeConfig("server {\n  listen 80;\n  root /var/www;\n}"), true, "nginx");
  assert.equal(looksLikeConfig("DEBUG=true\nSECRET_KEY=abc123\nALLOWED_HOSTS=*"), true, "settings");
  assert.equal(looksLikeConfig("Is lodash secure?"), false);
  assert.equal(looksLikeCode("FROM python:3.6\nUSER root\nENV AWS_SECRET_ACCESS_KEY=AKIA123"), true);
  assert.equal(isRepoLink("https://github.com/lodash/lodash"), true);
  assert.equal(isRepoLink("github.com/expressjs/express"), true);
  assert.equal(isRepoLink("https://example.com/github.com/x/y"), false);
  const r = await securityReview("", "https://github.com/lodash/lodash");
  assert.equal(r.error, "repository_not_fetched", "github.com's own headers are not the repository's security");
  assert.equal(r.vulnerability_count, null);
});

test("a server banner with a version is a CWE-200 finding", () => {
  const f = headerFindings({ "strict-transport-security": "x", "content-security-policy": "frame-ancestors 'self'", "x-content-type-options": "nosniff",
    server: "Apache/2.4.29 (Ubuntu)" });
  assert.deepEqual(f.map((x) => x.id), ["CWE-200"]);
  assert.match(f[0]!.title, /Apache\/2\.4\.29/);
  assert.deepEqual(headerFindings({ "strict-transport-security": "x", "content-security-policy": "frame-ancestors 'self'", "x-content-type-options": "nosniff",
    server: "cloudflare" }), [], "a name with no version discloses nothing to target");
});

test("verdictOf follows the findings, and OSV severities and ids read as people search for them", () => {
  assert.equal(verdictOf([]), "Secure");
  assert.equal(verdictOf([{ id: "CWE-693", severity: "low", title: "x" }]), "Needs changes");
  assert.equal(verdictOf([{ id: "CVE-1", severity: "unknown", title: "x" }, { id: "CVE-2", severity: "high", title: "y" }]), "Insecure");
  assert.equal(osvSeverity({ database_specific: { severity: "MODERATE" } }), "medium");
  assert.equal(osvSeverity({}), "unknown");
  assert.equal(issueId({ id: "GHSA-p6mc-m468-83gw", aliases: ["CVE-2020-8203"] }), "CVE-2020-8203 (GHSA-p6mc-m468-83gw)");
  assert.equal(issueId({ id: "PYSEC-2018-28", aliases: [] }), "PYSEC-2018-28");
});

test("mergeAliases: one vulnerability listed by two databases counts once, the GHSA record kept", async () => {
  const { mergeAliases } = await import("../src/securityreview");
  const merged = mergeAliases([
    { id: "PYSEC-2018-28", aliases: ["CVE-2018-18074", "GHSA-x84v-xcm2-53pg"] },
    { id: "GHSA-x84v-xcm2-53pg", aliases: ["CVE-2018-18074"], database_specific: { severity: "HIGH" } },
    { id: "GHSA-9wx4-h78v-vm56", aliases: ["CVE-2024-35195"], database_specific: { severity: "MODERATE" } },
  ]);
  assert.equal(merged.length, 2, "requests 2.19.0 was counted 10 from OSV's 10 records, 5 of them duplicates");
  assert.equal(merged[0]!.id, "GHSA-x84v-xcm2-53pg");
  assert.equal(issueId(merged[0]!), "CVE-2018-18074 (GHSA-x84v-xcm2-53pg)");
});

test("headerFindings names each missing protection by its CWE", () => {
  const none = headerFindings({});
  assert.deepEqual(none.map((f) => f.id).sort(), ["CWE-1021", "CWE-319", "CWE-693", "CWE-693"].sort());
  const good = headerFindings({ "strict-transport-security": "max-age=63072000", "content-security-policy": "default-src 'self'; frame-ancestors 'none'",
    "x-content-type-options": "nosniff", "set-cookie": ["sid=1; Secure; HttpOnly"] });
  assert.deepEqual(good, []);
  assert.deepEqual(headerFindings({ "strict-transport-security": "x", "content-security-policy": "frame-ancestors 'self'", "x-content-type-options": "nosniff",
    "set-cookie": ["a=1"] }).map((f) => f.id), ["CWE-614", "CWE-1004"]);
});

test("parseCodeReview: CWE ids and severities required, sorted most serious first", () => {
  const r = parseCodeReview(JSON.stringify({ summary: "SQL is built from input.", findings: [
    { cwe: "CWE-79", severity: "medium", title: "Reflected XSS in render", line: 9, fix: "Escape output." },
    { cwe: "cwe-89", severity: "critical", title: "SQL injection in getUser", line: 3, fix: "Use a parameterised query." }] }));
  assert.deepEqual(r?.findings.map((f) => f.id), ["CWE-89", "CWE-79"]);
  assert.equal(r?.findings[0]!.where, "line 3");
  assert.equal(parseCodeReview(JSON.stringify({ summary: "x", findings: [{ cwe: "none", severity: "high", title: "t" }] })), null);
  assert.equal(parseCodeReview(JSON.stringify({ summary: "Looks fine.", findings: [] }))?.findings.length, 0);
});

const json = (o: unknown) => new Response(JSON.stringify(o), { status: 200, headers: { "content-type": "application/json" } });

test("packages: OSV's vulnerabilities for the exact version, counted, CVE first, verdict from severity", async () => {
  const real = globalThis.fetch;
  const asked: unknown[] = [];
  globalThis.fetch = (async (input: string | URL, init?: { body?: string }) => {
    const u = String(input);
    if (u.endsWith("/v1/querybatch")) { asked.push(JSON.parse(init!.body!)); return json({ results: [{ vulns: [{ id: "GHSA-p6mc-m468-83gw" }, { id: "GHSA-35jh-r3h4-6jhm" }] }] }); }
    if (u.includes("/v1/vulns/GHSA-p6mc")) return json({ id: "GHSA-p6mc-m468-83gw", aliases: ["CVE-2020-8203"], summary: "Prototype Pollution in lodash", database_specific: { severity: "HIGH" } });
    if (u.includes("/v1/vulns/GHSA-35jh")) return json({ id: "GHSA-35jh-r3h4-6jhm", aliases: ["CVE-2021-23337"], summary: "Command Injection in lodash", database_specific: { severity: "HIGH" } });
    return new Response("no", { status: 404 });
  }) as unknown as typeof fetch;
  try {
    const r = await securityReview("", "lodash@4.17.15");
    assert.deepEqual(asked, [{ queries: [{ package: { name: "lodash", ecosystem: "npm" }, version: "4.17.15" }] }]);
    assert.equal(r.verdict, "Insecure");
    assert.equal(r.vulnerability_count, 2);
    assert.deepEqual(r.issues, ["CVE-2020-8203 (GHSA-p6mc-m468-83gw)", "CVE-2021-23337 (GHSA-35jh-r3h4-6jhm)"]);
    assert.match(String(r.summary), /^Insecure: 2 known vulnerabilities affect lodash@4\.17\.15\./);
    assert.match(String(r.source), /OSV\.dev/);
    const f = scoredFields("/security-review", r);
    assert.equal(f.vulnerability_count ?? r.vulnerability_count, 2);
  } finally {
    globalThis.fetch = real;
  }
});

test("packages: an OSV outage is unknown, never Secure", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("down"); }) as unknown as typeof fetch;
  try {
    const r = await securityReview("", "requests==2.19.0");
    assert.equal(r.verdict, "unknown");
    assert.equal(r.vulnerability_count, null);
    assert.equal(r.error, "upstream_unavailable");
  } finally {
    globalThis.fetch = real;
  }
});

test("code: the model's findings set the verdict; the target goes in as JSON data", async () => {
  const real = globalThis.fetch;
  const bodies: Array<{ messages: Array<{ role: string; content: string }> }> = [];
  process.env.GROQ_API_KEY = "test-key-not-real";
  resetPhraseState();
  globalThis.fetch = (async (_u: string, init: { body: string }) => {
    bodies.push(JSON.parse(init.body));
    return json({ choices: [{ message: { content: JSON.stringify({ summary: "Secure. The query is built by string concatenation.",
      findings: [{ cwe: "CWE-89", severity: "critical", title: "SQL injection in getUser", line: 2, fix: "Use a parameterised query." }] }) } }] });
  }) as unknown as typeof fetch;
  try {
    const code = "function getUser(id) {\n  return db.query('SELECT * FROM users WHERE id = ' + id);\n}";
    const r = await securityReview("", code);
    assert.equal(r.verdict, "Insecure", "a critical finding is never Secure, whatever the model's summary said");
    assert.equal(r.vulnerability_count, 1);
    assert.deepEqual(r.issues, ["CWE-89"]);
    assert.match(String(r.summary), /^Insecure: The query is built/);
    assert.deepEqual(JSON.parse(bodies[0]!.messages[1]!.content), { target: code });
  } finally {
    globalThis.fetch = real;
    delete process.env.GROQ_API_KEY;
    resetPhraseState();
  }
});

test("no target is refused; a package named without a version is reviewed by the model, never called secure without one", async () => {
  assert.equal((await securityReview("", "")).error, "no_target");
  assert.equal((await securityReview("", "42")).error, "unrecognised_target");
  delete process.env.GROQ_API_KEY;
  resetPhraseState();
  const r = await securityReview("", "Is lodash secure?");
  assert.equal(r.target_kind, "described");
  assert.equal(r.verdict, "unknown", "no model, no verdict");
});

test("a described target gets a model review labelled as an assessment, not a scan (epoch 39 scored 0 on a refusal)", async () => {
  const real = globalThis.fetch;
  process.env.GROQ_API_KEY = "test-key-not-real";
  resetPhraseState();
  globalThis.fetch = (async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ summary: "The form builds SQL from user input.",
    findings: [{ cwe: "CWE-89", severity: "high", title: "SQL built from the login form's input", line: null, fix: "Use parameterised queries" }] }) } }] }), { status: 200 })) as unknown as typeof fetch;
  try {
    const r = await securityReview("", "a login form that builds SQL queries from user input");
    assert.equal(r.target_kind, "described");
    assert.equal(r.verdict, "Insecure");
    assert.equal(r.vulnerability_count, 1);
    assert.match(r.reason, /assessment of the target as named or described, not a scan/);
  } finally {
    globalThis.fetch = real;
    delete process.env.GROQ_API_KEY;
    resetPhraseState();
  }
});
