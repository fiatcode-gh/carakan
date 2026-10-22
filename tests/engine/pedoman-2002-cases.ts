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
];
