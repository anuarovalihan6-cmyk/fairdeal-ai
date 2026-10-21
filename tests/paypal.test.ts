import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { demoAgreement, sampleDescription } from "../lib/demo";
import { saveDeal, listPayments, getPaymentByOrder } from "../lib/db";
import { createOrder, syncOrder } from "../lib/paypal";

process.env.FAIRDEAL_DB_PATH = path.join(mkdtempSync(path.join(tmpdir(), "fairdeal-paypal-test-")), "test.sqlite");
process.env.PAYPAL_CLIENT_ID = "test-only-client";
process.env.PAYPAL_CLIENT_SECRET = "test-only-secret";
function setup() {
  const a = demoAgreement(sampleDescription, 30000, "2030-11-01");
  const deal = saveDeal({ id: randomUUID(), agreement: a, description: sampleDescription, source: { mode: "demo", label: "Test" }, evidence: [], acceptedMilestones: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  let order: any;
  const calls: { url: string; method?: string; key?: string | null }[] = [];
  let failCreate = false, failCapture = false, mismatch = false;
  const fetcher = (async (url: any, options: any = {}) => {
    const href = String(url);
    assert.ok(href.startsWith("https://api-m.sandbox.paypal.com/"), "Only Sandbox may be called");
    calls.push({ url: href, method: options.method, key: new Headers(options.headers).get("PayPal-Request-Id") });
    if (href.endsWith("/token")) return Response.json({ access_token: "test-access-token" });
    if (href.endsWith("/orders") && options.method === "POST") {
      if (failCreate) { failCreate = false; return Response.json({}, { status: 503 }); }
      const body = JSON.parse(options.body); assert.equal(body.purchase_units[0].amount.value, "90.00");
      assert.equal(body.intent, "CAPTURE");
      assert.match(body.payment_source.paypal.experience_context.return_url, /^http:\/\/(localhost|127\.0\.0\.1):3000/);
      order = { id: "TEST" + randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase(), status: "CREATED", purchase_units: body.purchase_units, links: [] };
      order.links = [{ rel: "payer-action", href: `https://www.sandbox.paypal.com/checkoutnow?token=${order.id}` }];
      return Response.json(order, { status: 201 });
    }
    if (href.endsWith("/capture")) {
      order.status = "COMPLETED";
      order.purchase_units[0].payments = { captures: [{ id: randomUUID(), status: "COMPLETED", amount: { currency_code: "USD", value: "90.00" } }] };
      if (failCapture) { failCapture = false; throw new Error("Simulated lost response after capture"); }
      return Response.json(order, { status: 201 });
    }
    const copy = structuredClone(order);
    if (mismatch) copy.purchase_units[0].amount.value = "1.00";
    return Response.json(copy);
  }) as typeof fetch;
  return { deal, m: a.milestones[0], calls, fetcher, approve: () => { order.status = "APPROVED"; }, failCreate: () => { failCreate = true; }, failCapture: () => { failCapture = true; }, mismatch: () => { mismatch = true; } };
}
test("mock transport: create, approval, capture, server verification, and concurrent duplicate protection", async () => {
  const s = setup();
  const [p, duplicate] = await Promise.all([createOrder(s.deal.id, s.m.id, s.fetcher), createOrder(s.deal.id, s.m.id, s.fetcher)]);
  assert.equal(p.orderId, duplicate.orderId); assert.equal(listPayments(s.deal.id).length, 1);
  assert.equal(s.calls.filter(c => c.url.endsWith("/orders")).length, 1);
  s.approve();
  const captured = await syncOrder(p.orderId!, "capture", s.fetcher);
  assert.equal(captured.status, "COMPLETED"); assert.ok(captured.captureId);
  await syncOrder(p.orderId!, "capture", s.fetcher);
  assert.equal(s.calls.filter(c => c.url.endsWith("/capture")).length, 1);
  assert.equal(s.calls.find(c => c.url.endsWith("/capture"))?.key, p.captureRequestId);
});
test("mock transport: cancelled checkout is not paid and reuses the original payable order", async () => {
  const s = setup(), p = await createOrder(s.deal.id, s.m.id, s.fetcher);
  const cancelled = await syncOrder(p.orderId!, "cancel", s.fetcher);
  assert.equal(cancelled.status, "CANCELLED"); assert.equal(cancelled.captureId, null);
  const resumed = await createOrder(s.deal.id, s.m.id, s.fetcher);
  assert.equal(resumed.orderId, p.orderId); assert.equal(resumed.status, "CREATED");
  assert.equal(s.calls.filter(c => c.url.endsWith("/orders")).length, 1);
});
test("mock transport: uncertain creation retries with the same persisted request ID", async () => {
  const s = setup(); s.failCreate();
  await assert.rejects(createOrder(s.deal.id, s.m.id, s.fetcher));
  const before = listPayments(s.deal.id)[0]; assert.equal(before.status, "UNKNOWN");
  const recovered = await createOrder(s.deal.id, s.m.id, s.fetcher);
  assert.equal(recovered.createRequestId, before.createRequestId);
  const keys = s.calls.filter(c => c.url.endsWith("/orders")).map(c => c.key);
  assert.equal(keys[0], keys[1]);
});
test("mock transport: lost capture response recovers by verification without a second capture", async () => {
  const s = setup(), p = await createOrder(s.deal.id, s.m.id, s.fetcher);
  s.approve(); s.failCapture();
  await assert.rejects(syncOrder(p.orderId!, "capture", s.fetcher));
  assert.equal(getPaymentByOrder(p.orderId!).status, "UNKNOWN");
  const recovered = await syncOrder(p.orderId!, "capture", s.fetcher);
  assert.equal(recovered.status, "COMPLETED");
  assert.equal(s.calls.filter(c => c.url.endsWith("/capture")).length, 1);
});
test("mock transport: amount mismatch prevents completed status; foreign orders are rejected", async () => {
  const s = setup(), p = await createOrder(s.deal.id, s.m.id, s.fetcher);
  s.approve(); s.mismatch();
  await assert.rejects(syncOrder(p.orderId!, "capture", s.fetcher));
  assert.notEqual(getPaymentByOrder(p.orderId!).status, "COMPLETED");
  assert.equal(s.calls.filter(c => c.url.endsWith("/capture")).length, 0);
  await assert.rejects(syncOrder("NOTALOCALORDER", "capture", s.fetcher));
});
