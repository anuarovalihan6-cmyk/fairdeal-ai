import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { seedDemo, listDeals, getDeal, saveDeal, listPayments } from "@/lib/db";
import { createSchema, validateAgreement } from "@/lib/schema";
import { createAgreement, scanRisks, mediate, aiReady } from "@/lib/ai";
import { createOrder, syncOrder, paypalReady, appUrl } from "@/lib/paypal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const modeSchema = z.enum(["demo", "live"]);
function guard(req: NextRequest) {
  const local = new URL(`http://${req.headers.get("host") || req.nextUrl.host}`);
  if (!["localhost", "127.0.0.1"].includes(local.hostname)) throw new Error("This demo is available on this computer only.");
  const origin = req.headers.get("origin");
  const allowed = [appUrl(), `http://localhost${local.port ? `:${local.port}` : ""}`, `http://127.0.0.1${local.port ? `:${local.port}` : ""}`];
  if (origin && !allowed.includes(origin)) throw new Error("Request origin is not allowed.");
  if (req.method !== "GET" && req.headers.get("x-fairdeal-local") !== "1") throw new Error("Missing local request header.");
}
async function handle(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    guard(req);
    const { path } = await context.params;
    seedDemo();
    if (req.method === "GET" && path.join("/") === "state") return NextResponse.json({
      deals: listDeals(), payments: listPayments(), config: { aiReady: aiReady(), paypalReady: paypalReady(), sandboxOnly: true }
    }, { headers: { "Cache-Control": "no-store" } });
    if (req.method !== "POST") return NextResponse.json({ error: "Route not found." }, { status: 404 });
    const raw = await req.text();
    if (Buffer.byteLength(raw) > 60000) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    const body = JSON.parse(raw);
    if (path.join("/") === "deals") {
      const input = createSchema.parse(body);
      if (input.deadline < new Date().toISOString().slice(0, 10)) throw new Error("Choose today or a future project deadline.");
      const result = await createAgreement(input);
      const now = new Date().toISOString();
      const deal = saveDeal({ id: randomUUID(), description: input.description, language: input.language, ...result, evidence: [], acceptedMilestones: [], createdAt: now, updatedAt: now });
      return NextResponse.json({ deal });
    }
    if (path[0] === "deals" && path.length === 3) {
      const deal = getDeal(path[1]);
      const version = deal.updatedAt;
      if (path[2] === "edit") {
        if (listPayments(deal.id).some(p => p.status !== "FAILED")) throw new Error("This agreement is locked while it has a Sandbox order, including a cancelled checkout. Create a new deal for changed terms.");
        const agreement = validateAgreement(body.agreement);
        const oldIds = new Set(deal.agreement.milestones.map(m => m.id));
        if (agreement.milestones.some(m => !oldIds.has(m.id)) || agreement.milestones.length !== oldIds.size) throw new Error("Keep the existing milestone identifiers when editing this deal.");
        deal.agreement = agreement; delete deal.risk; delete deal.mediation; deal.acceptedMilestones = [];
        return NextResponse.json({ deal: saveDeal(deal) });
      }
      if (path[2] === "scan") {
        const result = await scanRisks(deal.agreement, modeSchema.parse(body.mode), deal.language || "en");
        const current = getDeal(deal.id);
        if (current.updatedAt !== version) throw new Error("The agreement changed during analysis. Run the scanner again.");
        current.risk = result; return NextResponse.json({ deal: saveDeal(current) });
      }
      if (path[2] === "evidence") {
        const input = z.object({ milestoneId: z.string(), text: z.string().trim().min(10).max(6000) }).parse(body);
        if (!deal.agreement.milestones.some(m => m.id === input.milestoneId)) throw new Error("Milestone not found.");
        if (deal.evidence.length >= 50) throw new Error("This demo supports up to 50 work submissions per project.");
        deal.evidence.push({ ...input, id: randomUUID(), createdAt: new Date().toISOString() });
        delete deal.mediation;
        return NextResponse.json({ deal: saveDeal(deal) });
      }
      if (path[2] === "accept") {
        const id = z.string().parse(body.milestoneId);
        if (!deal.evidence.some(e => e.milestoneId === id)) throw new Error("Submit work before recording a milestone review.");
        if (!deal.acceptedMilestones.includes(id)) deal.acceptedMilestones.push(id);
        return NextResponse.json({ deal: saveDeal(deal) });
      }
      if (path[2] === "mediate") {
        const input = z.object({ clientStatement: z.string().trim().min(10).max(4000), freelancerStatement: z.string().trim().min(10).max(4000), mode: modeSchema }).parse(body);
        const result = await mediate(deal.agreement, input.clientStatement, input.freelancerStatement, deal.evidence, input.mode, deal.language || "en");
        const current = getDeal(deal.id);
        if (current.updatedAt !== version) throw new Error("The project changed during analysis. Try again.");
        current.mediation = { ...result, clientStatement: input.clientStatement, freelancerStatement: input.freelancerStatement, createdAt: new Date().toISOString() };
        return NextResponse.json({ deal: saveDeal(current) });
      }
    }
    if (path.join("/") === "payments") {
      const input = z.object({ dealId: z.string(), milestoneId: z.string() }).parse(body);
      return NextResponse.json({ payment: await createOrder(input.dealId, input.milestoneId) });
    }
    if (path[0] === "payments" && path.length === 3) {
      const orderId = z.string().regex(/^[a-zA-Z0-9]{5,40}$/).parse(path[1]);
      const action = z.enum(["capture", "verify", "cancel"]).parse(path[2]);
      return NextResponse.json({ payment: await syncOrder(orderId, action) });
    }
    return NextResponse.json({ error: "Route not found." }, { status: 404 });
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues.map(i => `${i.path.join(".")}: ${i.message}`).slice(0, 3).join(" · ") : error instanceof Error ? error.message : "The request could not be completed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
export const GET = handle;
export const POST = handle;
