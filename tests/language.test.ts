import { test } from "node:test";
import assert from "node:assert/strict";
import { demoAgreement, demoMediation, demoRisks } from "../lib/demo";
import { coffeeBriefRu } from "../lib/demo-ru";
import { translate } from "../lib/i18n";
import { clauses, createSchema, validateAgreement } from "../lib/schema";

test("Russian sample keeps exact amounts, dates, editable terms and language schema", () => {
  const input = createSchema.parse({ description:coffeeBriefRu, budgetCents:30000, deadline:"2030-11-01", language:"ru" });
  const agreement = validateAgreement(demoAgreement(input.description, input.budgetCents, input.deadline, input.language));
  assert.match(agreement.title, /Кофейня/);
  assert.match(agreement.scope, /трёх страниц/);
  assert.deepEqual(agreement.milestones.map(m => m.amountCents), [9000,12000,9000]);
  assert.equal(agreement.deadline,"2030-11-01");
  assert.throws(() => createSchema.parse({...input,language:"de"}));
});
test("Russian risk checks flag the same three gaps and reviewed suggestions resolve them", () => {
  const a = demoAgreement(coffeeBriefRu,30000,"2030-11-01","ru");
  const report = demoRisks(a,"ru");
  assert.equal(report.findings.length,3);
  assert.match(report.findings[0].title,/правок/);
  for (const f of report.findings) if (f.section !== "deliverables") a[f.section] = f.suggestion;
  assert.equal(demoRisks(a,"ru").findings.length,0);
});
test("Russian mediation identifies the payment scope gap and preserves exact original quotes", () => {
  const a = demoAgreement(coffeeBriefRu,30000,"2030-11-01","ru");
  const analysis = demoMediation(a,"Я ожидал онлайн-оплату на сайте", "Онлайн-оплата не входила в проект",1,"ru");
  assert.match(analysis.recommendation,/отдельное письменное дополнение/);
  assert.match(analysis.facts[1],/Сохранено описаний работы: 1/);
  for (const ref of analysis.references) assert.ok(clauses(a)[ref.section].includes(ref.quote));
  const switched = demoMediation(a,"I expected online payments", "It was outside scope",1,"en");
  assert.match(switched.recommendation,/separate written change request/);
  assert.equal(switched.references[0].quote,a.scope);
});
test("interface translations preserve originals and handle dates and dynamic labels", () => {
  assert.equal(translate("New deal","ru"),"Новый проект");
  assert.equal(translate("New deal","en"),"New deal");
  assert.equal(translate("Oct 28","ru"),"28 окт.");
  assert.equal(translate("Due Oct 28","ru"),"Срок: 28 окт.");
  assert.equal(translate("3 terms to look at together","ru"),"Условий для обсуждения: 3");
  assert.equal(translate("A user-authored sentence with <script>literal text</script>","ru"),"A user-authored sentence with <script>literal text</script>");
});
