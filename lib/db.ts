import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { demoAgreement, sampleDescription } from "./demo";
import type { Deal, Payment } from "./schema";

let database: DatabaseSync;
export function db() {
  if (database) return database;
  const file = process.env.FAIRDEAL_DB_PATH || path.join(process.cwd(), "data", "fairdeal.sqlite");
  mkdirSync(path.dirname(file), { recursive: true });
  database = new DatabaseSync(file);
  database.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS deals (id TEXT PRIMARY KEY, body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY, dealId TEXT NOT NULL REFERENCES deals(id), milestoneId TEXT NOT NULL,
      amountCents INTEGER NOT NULL, orderId TEXT UNIQUE, captureId TEXT UNIQUE, status TEXT NOT NULL,
      approvalUrl TEXT, createRequestId TEXT NOT NULL UNIQUE, captureRequestId TEXT NOT NULL UNIQUE,
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, error TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS one_active_payment ON payments(dealId, milestoneId)
      WHERE status NOT IN ('FAILED');
    CREATE TABLE IF NOT EXISTS ai_usage (day TEXT PRIMARY KEY, count INTEGER NOT NULL);
  `);
  return database;
}
export function listDeals(): Deal[] {
  return (db().prepare("SELECT body FROM deals ORDER BY rowid DESC").all() as { body: string }[]).map(r => JSON.parse(r.body));
}
export function getDeal(id: string): Deal {
  const row = db().prepare("SELECT body FROM deals WHERE id=?").get(id) as { body: string } | undefined;
  if (!row) throw new Error("Project not found.");
  return JSON.parse(row.body);
}
export function saveDeal(deal: Deal) {
  deal.updatedAt = new Date().toISOString();
  db().prepare("INSERT INTO deals(id,body) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body").run(deal.id, JSON.stringify(deal));
  return deal;
}
export function seedDemo() {
  if (listDeals().length) return;
  const deadline = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  saveDeal({ id: randomUUID(), description: sampleDescription,
    agreement: demoAgreement(sampleDescription, 30000, deadline),
    source: { mode: "demo", label: "Demo template · no AI call" },
    evidence: [], acceptedMilestones: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
}
export function listPayments(dealId?: string): Payment[] {
  return (dealId ? db().prepare("SELECT * FROM payments WHERE dealId=? ORDER BY createdAt DESC").all(dealId) : db().prepare("SELECT * FROM payments ORDER BY createdAt DESC").all()) as Payment[];
}
export function getPaymentByOrder(orderId: string): Payment {
  const p = db().prepare("SELECT * FROM payments WHERE orderId=?").get(orderId) as Payment | undefined;
  if (!p) throw new Error("This PayPal order does not belong to a local project.");
  return p;
}
export function writePayment(p: Payment) {
  p.updatedAt = new Date().toISOString();
  db().prepare(`INSERT INTO payments(id,dealId,milestoneId,amountCents,orderId,captureId,status,approvalUrl,createRequestId,captureRequestId,createdAt,updatedAt,error)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET orderId=excluded.orderId,captureId=excluded.captureId,status=excluded.status,approvalUrl=excluded.approvalUrl,updatedAt=excluded.updatedAt,error=excluded.error`).run(
    p.id, p.dealId, p.milestoneId, p.amountCents, p.orderId, p.captureId, p.status, p.approvalUrl,
    p.createRequestId, p.captureRequestId, p.createdAt, p.updatedAt, p.error);
  return p;
}
export function consumeAIQuota() {
  const day = new Date().toISOString().slice(0, 10);
  const r = db().prepare("INSERT INTO ai_usage(day,count) VALUES (?,1) ON CONFLICT(day) DO UPDATE SET count=count+1 WHERE count<40 RETURNING count").get(day);
  if (!r) throw new Error("Local daily AI request limit reached. Demo mode remains available.");
}
