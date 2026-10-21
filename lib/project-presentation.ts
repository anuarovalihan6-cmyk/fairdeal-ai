import type { Agreement } from "./schema";
import type { Language } from "./i18n";
import { displayDemoText } from "./demo-ru";

const textFields = ["title", "summary", "scope", "exclusions", "revisions", "ownership", "acceptance", "paymentTerms"] as const;
const milestoneFields = ["title", "description", "acceptance"] as const;

export function presentAgreement(original: Agreement, language: Language): Agreement {
  const view = structuredClone(original);
  for (const field of textFields) view[field] = displayDemoText(original[field], language);
  view.deliverables = original.deliverables.map(s => displayDemoText(s, language));
  view.questions = original.questions.map(s => displayDemoText(s, language));
  view.milestones = original.milestones.map(m => ({ ...m,
    title: displayDemoText(m.title, language), description: displayDemoText(m.description, language), acceptance: displayDemoText(m.acceptance, language)
  }));
  return view;
}

/** An unchanged translated field must not overwrite the stored original on Save. */
export function restoreAgreementEdits(original: Agreement, edited: Agreement, baseline: Agreement): Agreement {
  const result = structuredClone(edited);
  for (const field of textFields) if (edited[field] === baseline[field]) result[field] = original[field];
  const restoreList = (values: string[], shown: string[], saved: string[]) => values.map(value => {
    const index = shown.indexOf(value); return index < 0 ? value : saved[index];
  });
  result.deliverables = restoreList(edited.deliverables, baseline.deliverables, original.deliverables);
  result.questions = restoreList(edited.questions, baseline.questions, original.questions);
  result.milestones = edited.milestones.map(m => {
    const saved = original.milestones.find(v => v.id === m.id), shown = baseline.milestones.find(v => v.id === m.id);
    if (!saved || !shown) return m;
    const restored = { ...m };
    for (const field of milestoneFields) if (m[field] === shown[field]) restored[field] = saved[field];
    return restored;
  });
  return result;
}
