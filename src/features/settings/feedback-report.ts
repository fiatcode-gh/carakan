/** Offline feedback path: the user copies this to paste into an email. Stays Indonesian (it is read by the maintainer, not the learner). */
export function buildFeedbackReport(input: {
  description: string;
  appVersion: string;
  rulesetId: string;
}): string {
  const { description, appVersion, rulesetId } = input;
  return `Laporan kesalahan — Carakan (Aksara Jawa)
Versi aplikasi: ${appVersion}
Aturan (ruleset): ${rulesetId}
Sumber aturan: Kongres Aksara Jawa I Yogyakarta 2021 (Tata Tulis Simplified), JGST (Komisi I), PUJL (Balai Bahasa Yogyakarta), Wewaton Sriwedari 1926 (nenek moyang), Pedoman Penulisan Aksara Jawa 2002.

Deskripsi kesalahan:
${description}`;
}
