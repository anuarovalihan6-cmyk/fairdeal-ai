import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createAgreement } from "../lib/ai";
import { demoAgreement, sampleDescription } from "../lib/demo";

test("new AI schedules receive today's date and reject past milestone deadlines", async () => {
  process.env.FAIRDEAL_DB_PATH = path.join(mkdtempSync(path.join(tmpdir(), "fairdeal-schedule-")), "test.sqlite");
  process.env.GEMINI_API_KEY = "test-only-not-a-real-key";
  process.env.GEMINI_FREE_TIER_CONFIRMED = "true";
  const originalFetch = globalThis.fetch;
  const today = new Date().toISOString().slice(0, 10);
  const input = { description: sampleDescription, budgetCents: 30000, deadline: "2030-11-01", mode: "live" as const };
  const stale = demoAgreement(sampleDescription, input.budgetCents, input.deadline);
  stale.milestones[0].deadline = "2001-01-01";
  globalThis.fetch = (async (_url: unknown, options: any) => {
    const body = JSON.parse(options.body);
    assert.equal(JSON.parse(body.contents[0].parts[0].text).currentDate, today);
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(stale) }] } }] });
  }) as typeof fetch;
  try {
    const result = await createAgreement(input);
    assert.equal(result.source.mode, "demo");
    assert.ok(result.agreement.milestones.every(m => m.deadline >= today));
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_FREE_TIER_CONFIRMED;
  }
});
