import {
  kajRulesetId,
  pedomanRulesetId,
  type RulesetId,
} from "../../engine/index.ts";

/** The report's rule-source line per ruleset (Indonesian; read by the maintainer). */
export const FEEDBACK_RULE_SOURCES: Readonly<Record<RulesetId, string>> = {
  [pedomanRulesetId]:
    "Pedoman Penulisan Aksara Jawa (Yayasan Pustaka Nusatama, 2002), Kongres Aksara Jawa I Yogyakarta 2021 (Tata Tulis Simplified; bila Pedoman tidak mengatur), JGST (Komisi I), PUJL (Balai Bahasa Yogyakarta)",
  [kajRulesetId]:
    "Kongres Aksara Jawa I Yogyakarta 2021 (Tata Tulis Simplified), JGST (Komisi I), PUJL (Balai Bahasa Yogyakarta), Wewaton Sriwedari 1926 (nenek moyang), Pedoman Penulisan Aksara Jawa 2002",
};

/** Offline feedback path: the user copies this to paste into an email. Stays Indonesian (it is read by the maintainer, not the learner). */
export function buildFeedbackReport(input: {
  description: string;
  appVersion: string;
  rulesetId: string;
  sources: string;
}): string {
  const { description, appVersion, rulesetId, sources } = input;
  return `Laporan kesalahan — Carakan (Aksara Jawa)
Versi aplikasi: ${appVersion}
Aturan (ruleset): ${rulesetId}
Sumber aturan: ${sources}.

Deskripsi kesalahan:
${description}`;
}
