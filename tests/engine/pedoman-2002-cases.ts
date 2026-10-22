import { ak } from "./support/aksara-builder.ts";

export interface PedomanCase {
  readonly input: string;
  readonly useMurda?: boolean;
  /** "Ped p.N …" or "Pedoman silent: KAJ I kept" — the CITATIONS Pedoman section's cite. */
  readonly cite: string;
  readonly expect:
    | {
        readonly kind: "success";
        readonly aksara: string;
        readonly roundTrip: boolean;
        readonly jgst?: string;
      }
    | {
        readonly kind: "ambiguous";
        readonly candidates: readonly string[];
        readonly reason: string;
      }
    | {
        readonly kind: "error";
        readonly message: string;
        readonly index?: number;
      };
}

const notInRuleset = "This murda is not part of Pedoman 2002";
const notInitial = "Murda is written only on the first aksara of a word";
const longVowel = "Long vowels have no sign in Pedoman 2002";
const vowelPairReason =
  '"ai"/"au" is two aksara in Pedoman 2002: ha between the vowels or a swara letter. Choose a reading, or type the h (sinahu).';
const bothReason =
  'Bare "e" is pepet (ě) or taling (é), and "ai"/"au" is two aksara in Pedoman 2002 (ha or a swara letter). Choose a reading.';

// Combining-mark JGST inputs reuse the code points of src/engine/murda.ts.
export const pedomanCases: readonly PedomanCase[] = [
  {
    input: "c\u0323aka",
    cite: "Ped p.11 no.1",
    expect: { kind: "error", message: notInRuleset, index: 0 },
  },
  {
    input: "jñana",
    cite: "Ped p.11 no.1",
    expect: { kind: "error", message: notInRuleset, index: 0 },
  },
  {
    input: "j\u0323awa",
    cite: "Ped p.11 no.1",
    expect: { kind: "error", message: notInRuleset, index: 0 },
  },
  {
    input: "\u1e5faja",
    cite: "Ped p.11 no.1",
    expect: { kind: "error", message: notInRuleset, index: 0 },
  },
  {
    input: "\u1e47a\u1e05i",
    cite: "Ped p.12 (Nabi Nuh)",
    expect: { kind: "error", message: notInitial, index: 2 },
  },
  {
    input: "rad\u011b\u1e47/",
    cite: "Ped p.11-12 no.3",
    expect: { kind: "error", message: notInitial, index: 4 },
  },
  {
    input: "\u1e47abi",
    cite: "Ped p.12",
    expect: {
      kind: "success",
      aksara: ak("NA_MURDA BA WULU"),
      roundTrip: true,
    },
  },
  {
    input: "\u1e05ima",
    cite: "Ped p.11-13",
    expect: {
      kind: "success",
      aksara: ak("BA_MURDA WULU MA"),
      roundTrip: true,
    },
  },
  {
    input: "Nabi Nuh",
    useMurda: true,
    cite: "Ped p.12",
    expect: {
      kind: "success",
      aksara: ak("NA_MURDA BA WULU NA_MURDA SUKU WIGNYAN"),
      roundTrip: false,
    },
  },
  {
    input: "Kabupatèn Kudus",
    useMurda: true,
    cite: "Ped p.12",
    expect: {
      kind: "success",
      aksara: ak(
        "KA_MURDA BA SUKU PA TA TALING NA PANGKON KA_MURDA SUKU DA SUKU SA PANGKON",
      ),
      roundTrip: false,
    },
  },
  {
    input: "Radèn Gandamana",
    useMurda: true,
    cite: "Ped p.13",
    expect: {
      kind: "success",
      aksara: ak("RA DA TALING NA PANGKON GA_MURDA NA PANGKON DA MA NA"),
      roundTrip: false,
    },
  },
  {
    input: "Kraton",
    useMurda: true,
    cite: "Ped p.12 (Kali Krasak)",
    expect: {
      kind: "success",
      aksara: ak("KA_MURDA CAKRA TA TALING TARUNG NA PANGKON"),
      roundTrip: false,
    },
  },
  {
    input: "Cakra",
    useMurda: true,
    cite: "Ped p.11 no.1",
    expect: {
      kind: "success",
      aksara: ak("CA KA PANGKON RA"),
      roundTrip: false,
    },
  },
  {
    input: "vila",
    cite: "Ped p.16",
    expect: {
      kind: "success",
      aksara: ak("PA CECAK_TELU WULU LA"),
      roundTrip: true,
      jgst: "fila",
    },
  },
  {
    input: "vakum/",
    cite: "Ped p.16",
    expect: {
      kind: "success",
      aksara: ak("PA CECAK_TELU KA SUKU MA PANGKON"),
      roundTrip: true,
      jgst: "fakum/",
    },
  },
  {
    input: "fajar",
    cite: "Ped p.16",
    expect: {
      kind: "success",
      aksara: ak("PA CECAK_TELU JA LAYAR"),
      roundTrip: true,
    },
  },
  {
    input: "pii",
    cite: "Ped p.18-28 (no long-vowel sign)",
    expect: { kind: "error", message: longVowel, index: 1 },
  },
  {
    input: "pūja",
    cite: "Ped p.18-28",
    expect: { kind: "error", message: longVowel, index: 1 },
  },
  {
    input: "ngajak Aan",
    cite: "Ped p.13-15 (no long swara)",
    expect: { kind: "error", message: longVowel },
  },
  {
    input: "maaf/",
    cite: "Pedoman silent: KAJ I kept (a ganda)",
    expect: {
      kind: "success",
      aksara: ak("MA A PA CECAK_TELU PANGKON"),
      roundTrip: true,
    },
  },
  {
    input: "sinau",
    cite: "Ped p.33, p.59 no.3",
    expect: {
      kind: "ambiguous",
      candidates: [ak("SA WULU NA HA SUKU"), ak("SA WULU NA U")],
      reason: vowelPairReason,
    },
  },
  {
    input: "ramai",
    cite: "Ped p.59 no.2",
    expect: {
      kind: "ambiguous",
      candidates: [ak("RA MA HA WULU"), ak("RA MA I")],
      reason: vowelPairReason,
    },
  },
  {
    input: "aula",
    cite: "Ped p.59 no.3",
    expect: {
      kind: "ambiguous",
      candidates: [ak("HA HA SUKU LA"), ak("HA U LA")],
      reason: vowelPairReason,
    },
  },
  {
    input: "sinahu",
    cite: "Ped p.33",
    expect: {
      kind: "success",
      aksara: ak("SA WULU NA HA SUKU"),
      roundTrip: true,
      jgst: "sinahu",
    },
  },
  {
    input: "rame sinau",
    cite: "Ped p.33, p.59",
    expect: {
      kind: "ambiguous",
      candidates: [
        ak("RA MA PEPET SA WULU NA HA SUKU"),
        ak("RA MA PEPET SA WULU NA U"),
        ak("RA MA TALING SA WULU NA HA SUKU"),
        ak("RA MA TALING SA WULU NA U"),
      ],
      reason: bothReason,
    },
  },
  {
    input: "ngajak Abdul",
    cite: "Ped p.13 no.3",
    expect: {
      kind: "success",
      aksara: ak("NGA JA KA PANGKON ZWNJ A BA PANGKON DA SUKU LA PANGKON"),
      roundTrip: false,
    },
  },
  {
    input: "bapak Ibu",
    cite: "Ped p.13 no.3",
    expect: {
      kind: "success",
      aksara: ak("BA PA KA PANGKON ZWNJ I BA SUKU"),
      roundTrip: false,
    },
  },
  {
    input: "bapak ibu",
    cite: "Ped p.10 Catatan 1 (pasangan ha)",
    expect: {
      kind: "success",
      aksara: ak("BA PA KA PANGKON HA WULU BA SUKU"),
      roundTrip: true,
    },
  },
  {
    input: "adol klasa",
    cite: "Ped p.28",
    expect: {
      kind: "success",
      aksara: ak("HA DA TALING TARUNG LA PANGKON ZWNJ KA PANGKON LA SA"),
      roundTrip: true,
    },
  },
  {
    input: "golèk klungsu",
    cite: "Ped p.28",
    expect: {
      kind: "success",
      aksara: ak(
        "GA TALING TARUNG LA TALING KA PANGKON ZWNJ KA PANGKON LA SUKU CECAK SA SUKU",
      ),
      roundTrip: true,
    },
  },
  {
    input: "rimbag dwipurwa",
    cite: "Ped p.28",
    expect: {
      kind: "success",
      aksara: ak(
        "RA WULU MA PANGKON BA GA PANGKON ZWNJ DA PANGKON WA WULU PA SUKU LAYAR WA",
      ),
      roundTrip: true,
    },
  },
  {
    input: "liwat kṛtěg",
    cite: "Ped p.27-28",
    expect: {
      kind: "success",
      aksara: ak("LA WULU WA TA PANGKON ZWNJ KA KERET TA PEPET GA PANGKON"),
      roundTrip: true,
    },
  },
  {
    input: "bapak byar",
    cite: "Ped p.27-28",
    expect: {
      kind: "success",
      aksara: ak("BA PA KA PANGKON ZWNJ BA PENGKAL LAYAR"),
      roundTrip: true,
    },
  },
  {
    input: "anak priya",
    cite: "Ped p.27-28",
    expect: {
      kind: "success",
      aksara: ak("HA NA KA PANGKON ZWNJ PA CAKRA WULU YA"),
      roundTrip: true,
    },
  },
  {
    input: "bapak lunga",
    cite: "Ped p.5 (pasangan)",
    expect: {
      kind: "success",
      aksara: ak("BA PA KA PANGKON LA SUKU NGA"),
      roundTrip: true,
    },
  },
  {
    input: "bapak.",
    cite: "Ped p.50",
    expect: {
      kind: "success",
      aksara: ak("BA PA KA PANGKON LUNGSI"),
      roundTrip: true,
    },
  },
  {
    input: "lunga.",
    cite: "Ped p.50",
    expect: {
      kind: "success",
      aksara: ak("LA SUKU NGA LUNGSI"),
      roundTrip: true,
    },
  },
  {
    input: "bapak, ibu",
    cite: "Ped p.27 no.4.b",
    expect: {
      kind: "success",
      aksara: ak("BA PA KA PANGKON ZWNJ HA WULU BA SUKU"),
      roundTrip: true,
    },
  },
  {
    input: "iklan",
    cite: "Pedoman silent: KAJ I kept (ha carrier)",
    expect: {
      kind: "success",
      aksara: ak("HA WULU KA PANGKON LA NA PANGKON"),
      roundTrip: true,
    },
  },
];
