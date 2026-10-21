import { test } from "node:test";
import assert from "node:assert/strict";
import { demoAgreement, demoRisks, demoMediation, sampleDescription } from "../lib/demo";
import { validateAgreement, clauses } from "../lib/schema";
import { createAgreement } from "../lib/ai";

test("agreement templates preserve exact cents, dates, and unique milestones", () => {
  for (const budget of [300, 301, 30000, 1234567]) {
    const a = validateAgreement(demoAgreement(sampleDescription, budget, "2030-11-01"));
    assert.equal(a.milestones.reduce((s, m) => s + m.amountCents, 0), budget);
    assert.equal(new Set(a.milestones.map(m => m.id)).size, 3);
    assert.equal(a.milestones.at(-1)?.deadline, "2030-11-01");
  }
});
test("agreement validation rejects tampering, invalid dates, duplicate IDs and wrong totals", () => {
  const a = demoAgreement(sampleDescription, 30000, "2030-11-01");
  assert.throws(() => validateAgreement({ ...a, budgetCents: 30001 }), /equal/);
  assert.throws(() => validateAgreement({ ...a, deadline: "2030-02-31" }));
  assert.throws(() => validateAgreement({ ...a, milestones: a.milestones.map(m => ({ ...m, id: "duplicate" })) }), /unique/);
  assert.throws(() => validateAgreement({ ...a, milestones: a.milestones.map(m => ({ ...m, deadline: "2031-01-01" })) }), /after/);
  assert.throws(() => validateAgreement({ ...a, budgetCents: 3.5 }));
});
test("risk scanner finds real gaps and removes flags after suggested wording is reviewed", () => {
  const a = demoAgreement(sampleDescription, 30000, "2030-11-01");
  const report = demoRisks(a);
  assert.equal(report.findings.length, 3);
  assert.equal(report.findings.find(f => f.id === "revisions")?.severity, "high");
  for (const f of report.findings) if (f.section !== "deliverables") a[f.section] = f.suggestion;
  assert.equal(demoRisks(a).findings.length, 0);
});
test("mediator quotes saved clauses exactly and distinguishes missing evidence", () => {
  const a = demoAgreement(sampleDescription, 30000, "2030-11-01");
  const r = demoMediation(a, "I expected online payments.", "Online payments were not included.", 1);
  assert.match(r.recommendation, /separate written change request/);
  r.references.forEach(ref => assert.ok(clauses(a)[ref.section].includes(ref.quote)));
  assert.ok(r.missingEvidence.length);
  assert.match(r.facts.join(" "), /not independently/);
  const generic = demoMediation(a, "I wanted a red logo", "I used the approved blue logo", 0);
  assert.doesNotMatch(generic.recommendation, /informational website/);
});
test("missing AI key produces a clearly labeled offline fallback without a network call", async () => {
  delete process.env.GEMINI_API_KEY;
  const r = await createAgreement({ description: sampleDescription, budgetCents: 30000, deadline: "2030-11-01", mode: "live" });
  assert.equal(r.source.mode, "demo"); assert.match(r.source.reason!, /configured/);
});
