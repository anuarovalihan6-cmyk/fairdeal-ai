import { z } from "zod";

const text = (max = 4000) => z.string().trim().min(1).max(max);
export const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s, "Invalid date");
export const milestoneSchema = z.object({
  id: text(80), title: text(160), description: text(2000),
  amountCents: z.number().int().positive().max(100_000_000),
  deadline: date, acceptance: text(2000)
});
export const agreementSchema = z.object({
  title: text(160), summary: text(1200), scope: text(),
  deliverables: z.array(text(500)).min(1).max(12),
  exclusions: text(), revisions: text(), ownership: text(),
  acceptance: text(), paymentTerms: text(),
  questions: z.array(text(500)).max(10),
  budgetCents: z.number().int().min(300).max(100_000_000),
  currency: z.literal("USD"), deadline: date,
  milestones: z.array(milestoneSchema).min(1).max(8)
});
export type Agreement = z.infer<typeof agreementSchema>;
export const createSchema = z.object({
  description: text(6000).min(20),
  budgetCents: z.number().int().min(300).max(100_000_000),
  deadline: date, mode: z.enum(["demo", "live"]).default("demo"), language: z.enum(["en", "ru"]).default("en")
});
export const sectionIds = ["scope", "deliverables", "exclusions", "revisions", "ownership", "acceptance", "paymentTerms"] as const;
export const riskSchema = z.object({ findings: z.array(z.object({
  id: text(80), severity: z.enum(["high", "medium", "low"]),
  title: text(160), section: z.enum(sectionIds),
  explanation: text(1400), suggestion: text(2000)
})).max(12) });
export type RiskReport = z.infer<typeof riskSchema>;
export const mediatorSchema = z.object({
  summary: text(1600), facts: z.array(text(1000)).min(1).max(8),
  missingEvidence: z.array(text(1000)).min(1).max(8),
  references: z.array(z.object({ section: z.enum(sectionIds), quote: text(1000), relevance: text(1200) })).min(1).max(8),
  recommendation: text(2400), nextSteps: z.array(text(1000)).min(1).max(6)
});
export type Mediation = z.infer<typeof mediatorSchema>;
export type Source = { mode: "demo" | "live"; label: string; reason?: string };
export type Evidence = { id: string; milestoneId: string; text: string; createdAt: string };
export type Deal = {
  id: string; description: string; agreement: Agreement; source: Source; language?: "en" | "ru";
  risk?: RiskReport & { source: Source; scannedAt: string };
  mediation?: Mediation & { source: Source; clientStatement: string; freelancerStatement: string; createdAt: string };
  evidence: Evidence[]; acceptedMilestones: string[]; createdAt: string; updatedAt: string;
};
export type PaymentStatus = "INITIALIZING" | "CREATED" | "APPROVED" | "COMPLETED" | "CANCELLED" | "FAILED" | "PENDING" | "UNKNOWN";
export type Payment = {
  id: string; dealId: string; milestoneId: string; amountCents: number;
  orderId: string | null; captureId: string | null; status: PaymentStatus;
  approvalUrl: string | null; createRequestId: string; captureRequestId: string;
  createdAt: string; updatedAt: string; error: string | null;
};
export function validateAgreement(input: unknown): Agreement {
  const a = agreementSchema.parse(input);
  if (a.milestones.reduce((s, m) => s + m.amountCents, 0) !== a.budgetCents) throw new Error("Milestone amounts must equal the project budget exactly.");
  if (new Set(a.milestones.map(m => m.id)).size !== a.milestones.length) throw new Error("Milestone identifiers must be unique.");
  if (a.milestones.some(m => m.deadline > a.deadline)) throw new Error("A milestone deadline cannot be after the project deadline.");
  if (a.milestones.some((m, i) => i > 0 && m.deadline < a.milestones[i - 1].deadline)) throw new Error("Milestone deadlines must be in order.");
  return a;
}
export function clauses(a: Agreement): Record<typeof sectionIds[number], string> {
  return { scope: a.scope, deliverables: a.deliverables.join("\n"), exclusions: a.exclusions, revisions: a.revisions, ownership: a.ownership, acceptance: a.acceptance, paymentTerms: a.paymentTerms };
}
export const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
