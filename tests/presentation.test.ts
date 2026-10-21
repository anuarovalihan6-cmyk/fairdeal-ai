import { test } from "node:test";
import assert from "node:assert/strict";
import { demoAgreement, demoRisks, demoMediation, sampleDescription } from "../lib/demo";
import { coffeeBriefRu } from "../lib/demo-ru";
import { translate } from "../lib/i18n";
import { presentAgreement, restoreAgreementEdits } from "../lib/project-presentation";

test("regression: English view of a saved Russian coffee-shop project has English milestones throughout", () => {
  const original = demoAgreement(coffeeBriefRu,30000,"2030-11-01","ru");
  const before = JSON.stringify(original);
  const english = presentAgreement(original,"en");
  assert.deepEqual(english.milestones.map(m => m.title),["Direction & wireframes","Design & development","Final review & handover"]);
  assert.equal(/[А-Яа-яЁё]/.test(JSON.stringify(english)),false);
  assert.equal(translate(original.milestones[0].acceptance,"en"),"Client approves the page structure and one visual direction in writing.");
  assert.equal(JSON.stringify(original),before);
  assert.deepEqual(presentAgreement(english,"ru"),original);
});
test("Russian view translates an existing English sample, including risk analysis and mediation", () => {
  const original = demoAgreement(sampleDescription,30000,"2030-11-01");
  const russian = presentAgreement(original,"ru");
  assert.match(russian.milestones[1].title,/Дизайн/);
  const report = demoRisks(russian,"ru");
  assert.equal(report.findings.length,3);
  assert.equal(translate(report.findings[0].title,"en"),"“Until happy” has no finish line");
  const analysis = demoMediation(russian,"Я ожидал онлайн-оплату", "Она не входила в проект",1,"ru");
  assert.match(translate(analysis.recommendation,"en"),/separate written change request/);
  assert.match(translate(analysis.facts[1],"en"),/^1 work submission is recorded/);
  assert.equal(presentAgreement(russian,"en").scope,original.scope);
});
test("opening and saving the translated editor preserves every unchanged original field", () => {
  const original = demoAgreement(coffeeBriefRu,30001,"2030-11-01","ru");
  const baseline = presentAgreement(original,"en");
  assert.deepEqual(restoreAgreementEdits(original,baseline,baseline),original);
  const edited = structuredClone(baseline);
  edited.milestones[0].description = "A custom change written by the user.";
  const saved = restoreAgreementEdits(original,edited,baseline);
  assert.equal(saved.milestones[0].description,edited.milestones[0].description);
  assert.equal(saved.scope,original.scope);
  assert.equal(saved.milestones[0].title,original.milestones[0].title);
  assert.equal(saved.milestones[0].id,original.milestones[0].id);
  assert.equal(saved.milestones[0].amountCents,original.milestones[0].amountCents);
  assert.equal(saved.deadline,original.deadline);
});
test("unknown user text and transaction references are never machine-translated or rewritten", () => {
  for (const input of ["Мой уникальный текст заказчика без готового перевода.", "ORDER123ABC", "CAPTURE987XYZ", "<script>literal text</script>"]) {
    assert.equal(translate(input,"en"),input);
    assert.equal(translate(input,"ru"),input);
  }
});
