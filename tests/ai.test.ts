import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createAgreement, scanRisks, mediate } from "../lib/ai";
import { demoAgreement, demoMediation, sampleDescription } from "../lib/demo";

test("mock Gemini transport: valid structured inference and labeled fallbacks for invalid output, references, quota and timeout", async () => {
  process.env.FAIRDEAL_DB_PATH = path.join(mkdtempSync(path.join(tmpdir(), "fairdeal-ai-test-")), "test.sqlite");
  process.env.GEMINI_API_KEY = "test-only-not-a-real-key";
  process.env.GEMINI_FREE_TIER_CONFIRMED = "true";
  const originalFetch = globalThis.fetch;
  const input = { description: sampleDescription, budgetCents: 30000, deadline: "2030-11-01", mode: "live" as const };
  const a = demoAgreement(sampleDescription, 30000, input.deadline);
  let output: unknown = a, status = 200, malformed = false, timeout = false, calls = 0;
  globalThis.fetch = (async (url: any, options: any) => {
    calls++;
    assert.equal(String(url), "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent");
    const body = JSON.parse(options.body);
    assert.equal(body.generationConfig.responseMimeType, "application/json");
    assert.ok(body.generationConfig.responseJsonSchema.properties);
    assert.equal(body.generationConfig.thinkingConfig.thinkingLevel, "minimal");
    assert.equal(body.tools, undefined);
    assert.equal(new Headers(options.headers).get("x-goog-api-key"), "test-only-not-a-real-key");
    if (timeout) throw new DOMException("Test timeout", "TimeoutError");
    if (status !== 200) return Response.json({ error: "test" }, { status });
    return Response.json({ candidates: [{ content: { parts: [{ text: malformed ? "invalid JSON" : JSON.stringify(output) }] } }] });
  }) as typeof fetch;
  try {
    const valid = await createAgreement(input);
    assert.equal(valid.source.mode, "live"); assert.equal(valid.agreement.budgetCents, 30000);
    output = { ...a, budgetCents: 30001 };
    const wrongTotal = await createAgreement(input);
    assert.equal(wrongTotal.source.mode, "demo"); assert.equal(wrongTotal.agreement.budgetCents, 30000);
    const badReference = demoMediation(a, "Online payments were expected", "They were excluded", 0);
    badReference.references[0].quote = "This clause was invented by the model."; output = badReference;
    const mediated = await mediate(a, "Online payments were expected", "They were excluded", [], "live");
    assert.equal(mediated.source.mode, "demo"); assert.notEqual(mediated.references[0].quote, badReference.references[0].quote);
    malformed = true;
    assert.equal((await scanRisks(a, "live")).source.mode, "demo");
    malformed = false; status = 429;
    const limited = await scanRisks(a, "live");
    assert.equal(limited.source.mode, "demo"); assert.match(limited.source.reason!, /quota/);
    status = 200; timeout = true;
    const timedOut = await createAgreement(input);
    assert.equal(timedOut.source.mode, "demo"); assert.match(timedOut.source.reason!, /timed out/);
    assert.equal(calls, 6);
    const localLimit = await createAgreement(input);
    assert.equal(localLimit.source.mode, "demo"); assert.equal(calls, 6);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.GEMINI_API_KEY; delete process.env.GEMINI_FREE_TIER_CONFIRMED;
  }
});

test("a key without confirmed Free Tier never makes a provider request", async () => {
  const originalFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "test-only-not-a-real-key";
  process.env.GEMINI_FREE_TIER_CONFIRMED = "false";
  let calls = 0;
  globalThis.fetch = (async () => { calls++; throw new Error("Unexpected provider call"); }) as typeof fetch;
  try {
    const result = await createAgreement({ description: sampleDescription, budgetCents: 30000, deadline: "2030-11-01", mode: "live" });
    assert.equal(calls, 0);
    assert.equal(result.source.mode, "demo");
    assert.match(result.source.reason!, /confirmed free-tier key/);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_FREE_TIER_CONFIRMED;
  }
});
