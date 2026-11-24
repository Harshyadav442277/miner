import { test } from "node:test";
import assert from "node:assert/strict";
import { completeReview, reviewLine, reviewProblem } from "../src/review-validation";

const finding = (o: Record<string, unknown> = {}) => ({ severity: "high", issue: "off-by-one", fix: "use <", ...o });

test("reviewProblem: names the check a model review fails, null when complete", () => {
  assert.equal(reviewProblem({ verdict: "Request changes", findings: [finding()] }, false), null);
  assert.equal(reviewProblem({ findings: [] }, false), "verdict_missing");
  assert.equal(reviewProblem({ verdict: "Request Changes", findings: [] }, false), "verdict_not_allowed");
  assert.equal(reviewProblem({ verdict: "Approve" }, false), "findings_not_list");
  assert.equal(reviewProblem({ verdict: "Approve", findings: Array.from({ length: 21 }, () => finding()) }, false), "findings_over_20");
  assert.equal(reviewProblem({ verdict: "Comment", findings: ["x"] }, false), "finding_not_object");
  assert.equal(reviewProblem({ verdict: "Comment", findings: [finding({ severity: "major" })] }, false), "finding_severity");
  assert.equal(reviewProblem({ verdict: "Comment", findings: [finding({ issue: " " })] }, false), "finding_issue");
  assert.equal(reviewProblem({ verdict: "Comment", findings: [finding({ fix: null })] }, false), "finding_fix");
  assert.equal(reviewProblem({ verdict: "High", findings: [finding({ severity: "info" })] }, true), "risk_without_finding");
  assert.equal(reviewProblem({ verdict: "No issues found", findings: [] }, true), null);
});

test("completeReview: unchanged behaviour, true exactly when there is no problem", () => {
  assert.equal(completeReview({ verdict: "Approve", findings: [] }, false), true);
  assert.equal(completeReview({ verdict: "Approve", findings: [finding({ fix: 3 })] }, false), false);
  assert.equal(completeReview({ verdict: "Low", findings: [finding({ severity: "low" })] }, true), true);
});

test("reviewLine: categorical only, never the code or the model's words", () => {
  const code = "for (let i = 0; i <= arr.length; i++) {\n  total += arr[i];\n}\n";
  assert.equal(reviewLine("/code-review", { verdict: "Request Changes" }, "verdict_not_allowed", "unknown", "", code),
    "REVIEW /code-review stated=Request changes~case problem=verdict_not_allowed served=unknown top=none bytes=61 lines=3");
  const line = reviewLine("/code-review", { verdict: "my secret password is hunter2" }, "verdict_not_allowed", "unknown", "", "secret code");
  assert.match(line, /stated=other /);
  assert.doesNotMatch(line, /hunter2|secret code/);
  assert.match(reviewLine("/code-review", null, "not_json", "unknown", "", "x"), /stated=none problem=not_json/);
  assert.match(reviewLine("/code-review", {}, "verdict_missing", "unknown", "", "x"), /stated=missing/);
  assert.match(reviewLine("/contract-audit", { verdict: "Low" }, null, "Low", "low", "x"), /stated=Low problem=none served=Low top=low/);
});
