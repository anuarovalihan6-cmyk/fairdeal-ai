import { randomUUID } from "node:crypto";
import type { Agreement, RiskReport, Mediation } from "./schema";
import { clauses } from "./schema";
import { demoLocale } from "./demo-ru";
import type { Language } from "./i18n";

export const sampleDescription = "I need a website for Ember & Oak, my neighborhood coffee shop. My budget is $300 and I need it in 7 days. Include a homepage, our menu, and a contact page. The site should work on phones. I will provide our logo, menu, and photos.";
export function demoAgreement(description: string, budgetCents: number, deadline: string, language: Language = "en"): Agreement {
  const start = new Date(); start.setUTCHours(0, 0, 0, 0);
  const end = new Date(`${deadline}T00:00:00Z`);
  const due = (fraction: number) => new Date(start.getTime() + Math.max(0, end.getTime() - start.getTime()) * fraction).toISOString().slice(0, 10);
  const website = /website|web site|homepage|сайт|веб/i.test(description);
  const first = Math.floor(budgetCents * 0.3), second = Math.floor(budgetCents * 0.4);
  const coffee = /coffee|ember|кофе/i.test(description);
  return demoLocale({
    title: coffee ? "Ember & Oak · Website design" : website ? "Website design & development" : "Creative project · Draft agreement",
    summary: website ? "A welcoming digital home, built around a clear scope and shared expectations." : "An editable starting point. Confirm every deliverable before work begins.",
    scope: website ? "Design and build a responsive three-page informational website: Home, Menu, and Contact. The client supplies the logo, final copy, menu, and licensed photography before work begins." : `Project brief: ${description}\nThis sample template needs both parties to confirm the detailed scope before work begins.`,
    deliverables: website ? ["Responsive Home, Menu, and Contact pages", "Editable source files and a handover guide", "Mobile and desktop browser review"] : ["Initial concept based on the project brief", "Final deliverable in an agreed editable format", "A short handover guide"],
    exclusions: website ? "Online payments, online ordering, booking systems, ongoing hosting, and domain fees are excluded. Any addition requires a written change request." : "Third-party subscriptions, ongoing support, and additional work require a separately agreed change request.",
    revisions: "Revisions will be provided as needed until the client is happy.",
    ownership: "Ownership and licensing details are to be discussed.",
    acceptance: "The client reviews each milestone and confirms approval in writing. Review timing and a measurable completion checklist still need agreement.",
    paymentTerms: "Each milestone is paid separately through PayPal Sandbox after the client reviews it and explicitly approves the test payment. No real money is used. No automatic payments.",
    questions: ["What is the exact revision limit for each milestone?", "Which assets belong to the client after payment?", "How many business days does the client have to review work?"],
    budgetCents, currency: "USD", deadline,
    milestones: [
      { id: randomUUID(), title: website ? "Direction & wireframes" : "Discovery & direction", description: "Agree on the structure, visual direction, and required content.", amountCents: first, deadline: due(0.28), acceptance: "Client approves the page structure and one visual direction in writing." },
      { id: randomUUID(), title: website ? "Design & development" : "Build & refine", description: "Create the agreed deliverables and prepare a review version.", amountCents: second, deadline: due(0.72), acceptance: website ? "Three review pages are accessible; links work at mobile and desktop widths." : "A complete review version matches the confirmed scope." },
      { id: randomUUID(), title: "Final review & handover", description: "Resolve agreed feedback and deliver the editable source files.", amountCents: budgetCents - first - second, deadline, acceptance: "Agreed feedback is addressed and the client can open all delivered source files." }
    ]
  }, language);
}
export function demoRisks(a: Agreement, language: Language = "en"): RiskReport {
  const findings: RiskReport["findings"] = [];
  if (!/\b\d+\b|\b(one|two|three)\b|no revisions|два|двух|три|один|одного|без правок/i.test(a.revisions)) findings.push({ id: "revisions", severity: "high", title: "“Until happy” has no finish line", section: "revisions", explanation: "The revision clause does not set a numerical limit. Both sides could have different expectations of when work is complete.", suggestion: "Two rounds of revisions are included per milestone. Each round is one consolidated list of feedback. Additional rounds require a separately approved written quote." });
  if (!/transfer|assigned|license|retain|переходят|передаются|сохраняет|остаются/i.test(a.ownership)) findings.push({ id: "ownership", severity: "medium", title: "Who owns the final work?", section: "ownership", explanation: "Ownership and usage rights are left open. Clarify rights to source files, client assets, and third-party materials.", suggestion: "After the agreed payment, rights to the original final deliverables transfer to the client. The freelancer retains pre-existing tools. Third-party assets remain under their original licenses." });
  if (!/\b\d+\b|\b(one|two|three)\b|два|двух|три|один|одного/i.test(a.acceptance)) findings.push({ id: "acceptance", severity: "medium", title: "The review window is still open", section: "acceptance", explanation: "There is no defined review period. Agree when feedback is due and which checklist determines completion.", suggestion: "The client has 3 business days to review each submission against its milestone acceptance criteria and send one consolidated feedback list. Silence does not count as approval." });
  if (!/exclud|not include|out of scope|не входят|исключены|не входит|отдельного/i.test(a.exclusions)) findings.push({ id: "exclusions", severity: "medium", title: "Make the boundaries explicit", section: "exclusions", explanation: "The exclusions do not clearly identify work outside the agreement.", suggestion: "Online payments, online ordering, hosting, domain fees, and ongoing maintenance are excluded. Changes require a written scope, price, and deadline approved by both parties." });
  if (!/approv|review|due|after|before|после|подтвержд|провер|одобр/i.test(a.paymentTerms)) findings.push({ id: "payment", severity: "high", title: "Payment trigger needs a decision", section: "paymentTerms", explanation: "The agreement does not clearly say when a milestone payment can be requested.", suggestion: "The client reviews each milestone before explicitly approving its PayPal Sandbox test payment. Additional work needs a separate written agreement. Payments are never automatic." });
  if (a.deliverables.some(d => /etc\.?|as needed|everything/i.test(d))) findings.push({ id: "deliverables", severity: "low", title: "Replace open-ended deliverables", section: "deliverables", explanation: "An open-ended phrase can expand the scope unexpectedly.", suggestion: "List each final file or page, its format, and the specific check used to accept it." });
  return demoLocale({ findings }, language);
}
export function demoMediation(a: Agreement, clientStatement: string, freelancerStatement: string, evidenceCount: number, language: Language = "en"): Mediation {
  const c = clauses(a);
  const paymentsConflict = /payment|checkout|ordering|онлайн.?оплат|оплат.*сайт/i.test(clientStatement + " " + freelancerStatement) && /online payments.*excluded|excluded.*online payments|онлайн.?оплата.*не входят|онлайн.?оплат.*исключ/i.test(a.exclusions);
  const result: Mediation = {
    summary: paymentsConflict ? "The agreement excludes online payments. The statements suggest an expectation gap that can be handled as a proposed scope change." : "The parties describe different expectations. Use the written scope and submitted work as a starting point, then confirm the disputed requirement together.",
    facts: ["The saved agreement contains the scope and exclusions quoted below.", `${evidenceCount} work submission${evidenceCount === 1 ? " is" : "s are"} recorded; their contents have not been independently verified.`, "Both statements are party claims, not independently established facts."],
    missingEvidence: ["Any written change request accepted by both parties.", "Dated messages or an approved brief that clarify the disputed requirement.", "A joint review of the submitted work against the milestone checklist."],
    references: [{ section: "scope", quote: c.scope.slice(0, 900), relevance: "Defines the work the parties originally described." }, { section: "exclusions", quote: c.exclusions.slice(0, 900), relevance: paymentsConflict ? "Explicitly excludes online payments from this project." : "Lists boundaries that should be checked against the disputed requirement." }],
    recommendation: paymentsConflict ? "Review the informational website against the original acceptance criteria. If the client still wants online payments, agree on a separate written change request with its own cost and deadline. Neither party should assume the added feature is already approved." : "Compare the disputed requirement with the quoted clauses and any dated messages. If it was included, agree on a correction plan. If it was outside scope, propose a written change request. Leave the issue unresolved until both parties agree.",
    nextSteps: ["Review the cited clauses together.", "Share the missing documents and confirm the facts.", "Record an agreed correction or change request before continuing."]
  };
  const localized = demoLocale(result, language);
  // Quotes always remain exact copies of the stored clauses, in their saved language.
  localized.references = localized.references.map((r, i) => ({ ...r, quote: result.references[i].quote }));
  return localized;
}
