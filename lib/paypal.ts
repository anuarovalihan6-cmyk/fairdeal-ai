import { randomUUID } from "node:crypto";
import { getDeal, listPayments, writePayment, getPaymentByOrder } from "./db";
import type { Payment } from "./schema";

// Deliberately fixed: a live PayPal endpoint cannot be selected by configuration.
const BASE = "https://api-m.sandbox.paypal.com";
export const paypalReady = () => Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
export function appUrl() {
  const url = new URL(process.env.APP_URL || "http://localhost:3000");
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.protocol !== "http:") throw new Error("This prototype supports a local HTTP APP_URL only.");
  return url.origin;
}
type PPOrder = { id: string; status: string; purchase_units?: { custom_id?: string; amount?: { currency_code: string; value: string }; payments?: { captures?: { id: string; status: string; amount: { currency_code: string; value: string } }[] } }[]; links?: { href: string; rel: string }[] };
class PayPalError extends Error { constructor(message: string, public definitive = false) { super(message); } }
async function token(fetcher: typeof fetch) {
  if (!paypalReady()) throw new Error("PayPal Sandbox is not configured. Add the Sandbox credentials locally first.");
  const r = await fetcher(`${BASE}/v1/oauth2/token`, { method: "POST", signal: AbortSignal.timeout(20000), headers: { Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
  if (!r.ok) throw new PayPalError("PayPal Sandbox authentication failed. Check your Sandbox app credentials.");
  const data = await r.json();
  if (typeof data.access_token !== "string") throw new PayPalError("PayPal returned an invalid access token.");
  return data.access_token as string;
}
async function request(path: string, method: string, fetcher: typeof fetch, body?: unknown, requestId?: string): Promise<PPOrder> {
  const accessToken = await token(fetcher);
  const r = await fetcher(BASE + path, { method, signal: AbortSignal.timeout(25000), headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...(requestId ? { "PayPal-Request-Id": requestId } : {}), Prefer: "return=representation" }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  if (!r.ok) throw new PayPalError(`PayPal Sandbox request failed (HTTP ${r.status}). No payment has been marked complete. Verify the order or retry.`, r.status >= 400 && r.status < 500 && r.status !== 408 && r.status !== 429 && r.status !== 422);
  return r.json();
}
const pendingLocks = new Map<string, Promise<unknown>>();
async function locked<T>(key: string, operation: () => Promise<T>): Promise<T> {
  while (pendingLocks.has(key)) await pendingLocks.get(key)!.catch(() => {});
  const promise = operation(); pendingLocks.set(key, promise);
  try { return await promise; } finally { if (pendingLocks.get(key) === promise) pendingLocks.delete(key); }
}
export async function createOrder(dealId: string, milestoneId: string, fetcher: typeof fetch = fetch): Promise<Payment> {
  return locked(`${dealId}:${milestoneId}`, async () => {
    if (!paypalReady()) throw new Error("PayPal Sandbox is not configured. Add the Sandbox credentials locally first.");
    const deal = getDeal(dealId), m = deal.agreement.milestones.find(m => m.id === milestoneId);
    if (!m) throw new Error("Milestone not found.");
    const existing = listPayments(dealId).find(p => p.milestoneId === milestoneId && p.status !== "FAILED");
    if (existing?.orderId) {
      const checked = verifyOrder(existing, await request(`/v2/checkout/orders/${existing.orderId}`, "GET", fetcher));
      // A local cancellation does not void a PayPal order. Reuse it to avoid a second payable order.
      if (checked.status === "CANCELLED") checked.status = "CREATED";
      return writePayment(checked);
    }
    if (existing && Date.now() - Date.parse(existing.createdAt) > 5 * 3600000) throw new Error("This unresolved order is older than the safe retry window. Review your Sandbox activity manually before continuing.");
    let p: Payment = existing || { id: randomUUID(), dealId, milestoneId, amountCents: m.amountCents, orderId: null, captureId: null, status: "INITIALIZING", approvalUrl: null, createRequestId: randomUUID(), captureRequestId: randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), error: null };
    // Reserve before the network call. The unique index also protects across server workers.
    writePayment(p);
    try {
      const order = await request("/v2/checkout/orders", "POST", fetcher, {
        intent: "CAPTURE", purchase_units: [{ reference_id: m.id, custom_id: p.id, description: `FairDeal AI Sandbox: ${m.title}`.slice(0, 127), amount: { currency_code: "USD", value: (p.amountCents / 100).toFixed(2) } }],
        payment_source: { paypal: { experience_context: { brand_name: "FairDeal AI · Sandbox", user_action: "PAY_NOW", shipping_preference: "NO_SHIPPING", return_url: `${appUrl()}/?checkout=approved`, cancel_url: `${appUrl()}/?checkout=cancelled` } } }
      }, p.createRequestId);
      const approval = order.links?.find(l => ["payer-action", "approve"].includes(l.rel))?.href;
      if (!order.id || !/^[A-Z0-9]+$/i.test(order.id)) throw new Error("PayPal returned an invalid order reference.");
      p.orderId = order.id;
      if (!approval || new URL(approval).hostname !== "www.sandbox.paypal.com" || new URL(approval).protocol !== "https:") throw new Error("PayPal did not return a valid Sandbox approval link. Verify the order before continuing.");
      p = { ...p, status: "CREATED", approvalUrl: approval, error: null };
      return writePayment(p);
    } catch (e) {
      p.status = e instanceof PayPalError && e.definitive ? "FAILED" : "UNKNOWN";
      p.error = e instanceof PayPalError ? e.message : "The Sandbox order result is uncertain. Retry with the same request reference; do not assume a payment succeeded.";
      writePayment(p); throw new Error(p.error);
    }
  });
}
export function verifyOrder(p: Payment, order: PPOrder): Payment {
  if (order.id !== p.orderId || order.purchase_units?.length !== 1) throw new Error("PayPal order reference mismatch.");
  const unit = order.purchase_units[0];
  if (unit.custom_id !== p.id || unit.amount?.currency_code !== "USD" || unit.amount.value !== (p.amountCents / 100).toFixed(2)) throw new Error("PayPal order amount or project reference mismatch.");
  const captures = unit.payments?.captures || [];
  if (captures.length > 1) throw new Error("Unexpected multiple captures. Manual Sandbox review is required.");
  const capture = captures[0];
  if (capture && (capture.amount.currency_code !== "USD" || capture.amount.value !== (p.amountCents / 100).toFixed(2))) throw new Error("PayPal capture amount mismatch.");
  if (order.status === "COMPLETED" && capture?.status === "COMPLETED" && capture.id) return { ...p, status: "COMPLETED", captureId: capture.id, error: null };
  if (capture?.status === "PENDING") return { ...p, status: "PENDING", captureId: capture.id, error: "PayPal reports a pending capture. Verify later; do not create another payment." };
  if (capture && ["DECLINED", "FAILED", "DENIED"].includes(capture.status)) return { ...p, status: "FAILED", captureId: capture.id, error: "PayPal did not complete this capture." };
  if (order.status === "APPROVED") return { ...p, status: "APPROVED", error: null };
  if (["CREATED", "PAYER_ACTION_REQUIRED", "SAVED"].includes(order.status)) return { ...p, status: p.status === "CANCELLED" ? "CANCELLED" : "CREATED", error: null };
  if (order.status === "VOIDED") return { ...p, status: "FAILED", error: "PayPal voided this Sandbox order." };
  return { ...p, status: "UNKNOWN", error: "PayPal has not confirmed a completed capture. Verify again later." };
}
export async function syncOrder(orderId: string, action: "verify" | "capture" | "cancel", fetcher: typeof fetch = fetch): Promise<Payment> {
  const original = getPaymentByOrder(orderId);
  return locked(`${original.dealId}:${original.milestoneId}`, async () => {
    let p = getPaymentByOrder(orderId);
    try {
      // Always verify remotely, including cancellation and repeated capture requests.
      p = verifyOrder(p, await request(`/v2/checkout/orders/${orderId}`, "GET", fetcher));
      writePayment(p);
      if (action === "cancel" && p.status === "CREATED") { p.status = "CANCELLED"; return writePayment(p); }
      if (action !== "capture" || p.status === "COMPLETED" || p.status === "PENDING") return p;
      if (p.status !== "APPROVED") throw new Error("Approve this order in PayPal Sandbox before confirming the payment.");
      // Stable idempotency key survives retries, timeouts, and process restarts.
      await request(`/v2/checkout/orders/${orderId}/capture`, "POST", fetcher, {}, p.captureRequestId);
      p = verifyOrder(p, await request(`/v2/checkout/orders/${orderId}`, "GET", fetcher));
      return writePayment(p);
    } catch (e) {
      // A timeout could happen after PayPal captured the order. Preserve the order and recover through GET.
      if (p.status !== "COMPLETED") p.status = "UNKNOWN";
      p.error = e instanceof PayPalError ? e.message : "Payment confirmation is unresolved. Verify the Sandbox order status before retrying.";
      writePayment(p); throw new Error(p.error);
    }
  });
}
