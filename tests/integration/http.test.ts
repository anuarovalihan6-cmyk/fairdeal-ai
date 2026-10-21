import { test } from "node:test";
import assert from "node:assert/strict";
import { coffeeBriefRu } from "../../lib/demo-ru";

const base = process.env.FAIRDEAL_TEST_URL || "http://127.0.0.1:3000";
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error("HTTP tests must target the local prototype only.");
async function post(route: string, body: unknown, headers: Record<string, string> = {}) {
  const r = await fetch(`${base}/api/${route}`, { method: "POST", headers: { "Content-Type": "application/json", "x-fairdeal-local": "1", Origin: base, ...headers }, body: JSON.stringify(body) });
  return { status: r.status, data: await r.json() };
}
test("HTTP: complete offline workflow, exact totals, stale-report invalidation, input guards, and disabled payments", async () => {
  assert.equal((await fetch(base)).status, 200);
  const initial = await (await fetch(`${base}/api/state`)).json();
  assert.ok(initial.deals.length);
  assert.equal(typeof initial.config.paypalReady, "boolean");
  assert.equal(JSON.stringify(initial).includes("PAYPAL_CLIENT_SECRET"), false);
  const deadline = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  const input = { description: "HTTP QA fictional coffee shop website: Home, Menu, Contact, responsive layouts, with client-supplied assets.", budgetCents: 30101, deadline, mode: "demo" };
  const invalidOrigin = await post("deals", input, { Origin: "https://example.org" });
  assert.equal(invalidOrigin.status, 400); assert.match(invalidOrigin.data.error, /origin/);
  const missingHeader = await post("deals", input, { "x-fairdeal-local": "" });
  assert.equal(missingHeader.status, 400); assert.match(missingHeader.data.error, /header/);
  assert.equal((await post("deals", { ...input, budgetCents: -1 })).status, 400);
  // Both loopback aliases are valid browser origins; this regression caught an actual UI failure.
  const created = await post("deals", input, { Origin: base.replace("127.0.0.1", "localhost") });
  assert.equal(created.status, 200, JSON.stringify(created.data));
  const deal = created.data.deal;
  assert.equal(deal.source.mode, "demo");
  assert.equal(deal.agreement.milestones.reduce((sum: number, m: any) => sum + m.amountCents, 0), 30101);
  const scan = await post(`deals/${deal.id}/scan`, { mode: "demo" });
  assert.equal(scan.status, 200); assert.equal(scan.data.deal.risk.findings.length, 3);
  const badAgreement = structuredClone(deal.agreement); badAgreement.milestones[0].amountCents++;
  assert.equal((await post(`deals/${deal.id}/edit`, { agreement: badAgreement })).status, 400);
  const amended = structuredClone(deal.agreement);
  amended.revisions = "Two rounds of revisions are included per milestone. Extra work requires a separate written quote.";
  const edit = await post(`deals/${deal.id}/edit`, { agreement: amended });
  assert.equal(edit.status, 200); assert.equal(edit.data.deal.risk, undefined);
  const rescanned = await post(`deals/${deal.id}/scan`, { mode: "demo" });
  assert.equal(rescanned.data.deal.risk.findings.length, 2);
  const milestoneId = deal.agreement.milestones[0].id;
  assert.equal((await post(`deals/${deal.id}/accept`, { milestoneId })).status, 400);
  assert.equal((await post(`deals/${deal.id}/evidence`, { milestoneId: "foreign", text: "This cannot be attached to another milestone" })).status, 400);
  const evidence = await post(`deals/${deal.id}/evidence`, { milestoneId, text: "Fictional wireframes submitted for Home, Menu, and Contact pages." });
  assert.equal(evidence.status, 200); assert.equal(evidence.data.deal.evidence.length, 1);
  const accepted = await post(`deals/${deal.id}/accept`, { milestoneId });
  assert.equal(accepted.status, 200); assert.ok(accepted.data.deal.acceptedMilestones.includes(milestoneId));
  const mediation = await post(`deals/${deal.id}/mediate`, { clientStatement: "I expected online payments on the website", freelancerStatement: "Online payments were explicitly excluded from this project", mode: "demo" });
  assert.equal(mediation.status, 200); assert.equal(mediation.data.deal.mediation.source.mode, "demo");
  assert.ok(mediation.data.deal.mediation.references.every((r: any) => amended[r.section].includes(r.quote)));
  if (!initial.config.paypalReady) {
    const payment = await post("payments", { dealId: deal.id, milestoneId, amountCents: 1, status: "COMPLETED" });
    assert.equal(payment.status, 400); assert.match(payment.data.error, /not configured/);
    const after = await (await fetch(`${base}/api/state`)).json();
    assert.equal(after.payments.some((p: any) => p.dealId === deal.id), false);
  }
  const final = await (await fetch(`${base}/api/state`)).json();
  const stored = final.deals.find((d: any) => d.id === deal.id);
  assert.equal(stored.agreement.revisions, amended.revisions);
  assert.equal(stored.evidence.length, 1); assert.ok(stored.mediation);
});

test("HTTP: Russian coffee-shop agreement, scan, exact quotes and invalid language rejection", async () => {
  const input = { description:coffeeBriefRu, budgetCents:30000, deadline:new Date(Date.now()+7*86400000).toISOString().slice(0,10), mode:"demo", language:"ru" };
  assert.equal((await post("deals",{...input,language:"de"})).status,400);
  const created = await post("deals",input);
  assert.equal(created.status,200);
  const deal = created.data.deal;
  assert.equal(deal.language,"ru"); assert.match(deal.agreement.scope,/трёх страниц/);
  assert.deepEqual(deal.agreement.milestones.map((m:any) => m.amountCents),[9000,12000,9000]);
  const scan = await post(`deals/${deal.id}/scan`,{mode:"demo"});
  assert.equal(scan.status,200); assert.equal(scan.data.deal.risk.findings.length,3);
  assert.match(scan.data.deal.risk.findings[0].title,/правок/);
  const analysis = await post(`deals/${deal.id}/mediate`,{mode:"demo",clientStatement:"Я ожидал онлайн-оплату на сайте кофейни",freelancerStatement:"Онлайн-оплата не входила в соглашение"});
  assert.equal(analysis.status,200);
  assert.match(analysis.data.deal.mediation.recommendation,/отдельное письменное дополнение/);
  for (const ref of analysis.data.deal.mediation.references) assert.ok(deal.agreement[ref.section].includes(ref.quote));
  assert.equal(analysis.data.deal.agreement.budgetCents,30000);
});
