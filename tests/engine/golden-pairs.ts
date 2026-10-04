import { ak } from "./support/aksara-builder.ts";

/**
 * Golden corpus. Source key:
 * - KAJ1-BAB1-A1: KAJ I Yogyakarta 2021, Tata Tulis Simplified, Bab I A.1
 *   (carakan rows).
 * - KAJ1-TRANS: KAJ I, Daftar Transliterasi example tables.
 * - DERIVED-UTN47: encoding derived from UTN47 pasangan mechanics using
 *   attested words.
 */
export interface GoldenPair {
  /** User-facing school spelling. */
  readonly latinPujl: string;
  /** Canonical lossless transliteration. */
  readonly latinJgst: string;
  /** The aksara string (Unicode text order). */
  readonly aksara: string;
  readonly source: string;
  /**
   * False when PUJL input is ambiguous (bare e) and Latin->aksara from PUJL
   * is covered by the ambiguity tests instead.
   */
  readonly pujlRoundTrips?: boolean;
}

// v3: ha carrier (KAJ I p.5 3.b, p.124 8.b) - aksara, emas, endhog are removed:
// their PUJL back-form is no longer the school spelling and swara-initial
// aksara no longer round-trips from JGST. See v3_ha_carrier_test.dart.
export const goldenPairs: readonly GoldenPair[] = [
  {
    latinPujl: "hanacaraka",
    latinJgst: "hanacaraka",
    aksara: ak("HA NA CA RA KA"),
    source: "KAJ1-BAB1-A1",
  },
  {
    latinPujl: "datasawala",
    latinJgst: "datasawala",
    aksara: ak("DA TA SA WA LA"),
    source: "KAJ1-BAB1-A1",
  },
  {
    latinPujl: "padhajayanya",
    latinJgst: "paḍajayaña",
    aksara: ak("PA DA_MAHAPRANA JA YA NYA"),
    source: "KAJ1-BAB1-A1",
  },
  {
    latinPujl: "magabathanga",
    latinJgst: "magabaṭaṅa",
    aksara: ak("MA GA BA TTA NGA"),
    source: "KAJ1-BAB1-A1",
  },
  {
    latinPujl: "bapak",
    latinJgst: "bapak/",
    aksara: ak("BA PA KA PANGKON"),
    source: "KAJ1-TRANS",
  },
  {
    latinPujl: "dal",
    latinJgst: "dal/",
    aksara: ak("DA LA PANGKON"),
    source: "KAJ1-TRANS",
  },
  {
    latinPujl: "kacang",
    latinJgst: "kacaŋ",
    aksara: ak("KA CA CECAK"),
    source: "KAJ1-TRANS",
  },
  {
    latinPujl: "layang",
    latinJgst: "layaŋ",
    aksara: ak("LA YA CECAK"),
    source: "KAJ1-TRANS",
  },
  {
    latinPujl: "cacah",
    latinJgst: "cacaḥ",
    aksara: ak("CA CA WIGNYAN"),
    source: "KAJ1-TRANS",
  },
  {
    latinPujl: "mangan",
    latinJgst: "maṅan/",
    aksara: ak("MA NGA NA PANGKON"),
    source: "KAJ1-TRANS",
  },
  {
    latinPujl: "saté",
    latinJgst: "saté",
    aksara: ak("SA TA TALING"), // v3: Unicode order (taling after base)
    source: "KAJ1-TRANS",
  },
  {
    latinPujl: "gulé",
    latinJgst: "gulé",
    aksara: ak("GA SUKU LA TALING"), // v3: Unicode order (taling after base)
    source: "KAJ1-TRANS",
  },
  {
    latinPujl: "tuku",
    latinJgst: "tuku",
    aksara: ak("TA SUKU KA SUKU"),
    source: "KAJ1-TRANS",
  },
  {
    latinPujl: "suku",
    latinJgst: "suku",
    aksara: ak("SA SUKU KA SUKU"),
    source: "KAJ1-TRANS",
  },
  {
    latinPujl: "pipi",
    latinJgst: "pipi",
    aksara: ak("PA WULU PA WULU"),
    source: "KAJ1-TRANS",
  },
  {
    latinPujl: "siji",
    latinJgst: "siji",
    aksara: ak("SA WULU JA WULU"),
    source: "KAJ1-TRANS",
  },
  {
    latinPujl: "mati",
    latinJgst: "mati",
    aksara: ak("MA TA WULU"),
    source: "KAJ1-TRANS",
  },
  {
    latinPujl: "toko",
    latinJgst: "toko",
    aksara: ak("TA TALING TARUNG KA TALING TARUNG"), // v3: Unicode order (taling after base)
    source: "KAJ1-TRANS",
  },
  {
    latinPujl: "bocah",
    latinJgst: "bocaḥ",
    aksara: ak("BA TALING TARUNG CA WIGNYAN"), // v3: Unicode order (taling after base)
    source: "KAJ1-TRANS",
  },
  {
    latinPujl: "krasa",
    latinJgst: "kŕasa",
    aksara: ak("KA CAKRA SA"),
    source: "KAJ1-TRANS",
  },
  {
    latinPujl: "prelu",
    latinJgst: "pṛlu",
    aksara: ak("PA KERET LA SUKU"),
    source: "KAJ1-TRANS",
    pujlRoundTrips: false,
  }, // bare e in PUJL input is ambiguous
  {
    latinPujl: "setya",
    latinJgst: "sětỿa",
    aksara: ak("SA PEPET TA PENGKAL"),
    source: "KAJ1-TRANS",
    pujlRoundTrips: false,
  }, // bare e in PUJL input is ambiguous
  {
    latinPujl: "klapa",
    latinJgst: "klapa",
    aksara: ak("KA PANGKON LA PA"),
    source: "DERIVED-UTN47",
  },
  {
    latinPujl: "budi",
    latinJgst: "budi",
    aksara: ak("BA SUKU DA WULU"),
    source: "KAJ1-TRANS",
  },
  {
    latinPujl: "ḅima",
    latinJgst: "ḅima",
    aksara: ak("BA_MURDA WULU MA"),
    source: "KAJ1-BAB1-A2",
  },
  {
    latinPujl: "ṇaḅi",
    latinJgst: "ṇaḅi",
    aksara: ak("NA_MURDA BA_MURDA WULU"),
    source: "KAJ1-BAB1-A2",
  },
  {
    latinPujl: "tha",
    latinJgst: "ṭha",
    aksara: ak("TA_MURDA"),
    source: "KAJ1-TRANS",
    pujlRoundTrips: false, // plain "tha" is the PUJL reading of TTA
  },
  {
    latinPujl: "foto",
    latinJgst: "foto",
    aksara: ak("PA CECAK_TELU TALING TARUNG TA TALING TARUNG"), // v3: Unicode order (taling after base)
    source: "KAJ1-REKAN",
  },
  {
    latinPujl: "fajar",
    latinJgst: "fajaṙ",
    aksara: ak("PA CECAK_TELU JA LAYAR"),
    source: "KAJ1-REKAN",
  },
  {
    latinPujl: "vila",
    latinJgst: "vila",
    aksara: ak("WA CECAK_TELU WULU LA"),
    source: "KAJ1-REKAN",
  },
  {
    latinPujl: "ramai",
    latinJgst: "ramai",
    aksara: ak("RA MA DIRGA_MURE"),
    source: "KAJ1-KATA-ASING",
  },
  {
    latinPujl: "kacau",
    latinJgst: "kacau",
    aksara: ak("KA CA DIRGA_MURE TARUNG"),
    source: "KAJ1-KATA-ASING",
  },
  {
    latinPujl: "maaf",
    latinJgst: "maaf/",
    aksara: ak("MA A PA CECAK_TELU PANGKON"),
    source: "KAJ1-KATA-ASING",
  },
  {
    latinPujl: "buwaya",
    latinJgst: "buwaya",
    aksara: ak("BA SUKU WA YA"),
    source: "KAJ1-KATA-ASING",
  },
  {
    latinPujl: "tuwa",
    latinJgst: "tuwa",
    aksara: ak("TA SUKU WA"),
    source: "KAJ1-KATA-ASING",
  },
  {
    latinPujl: "lombok",
    latinJgst: "lombok/",
    aksara: ak("LA TALING TARUNG MA PANGKON BA TALING TARUNG KA PANGKON"), // v3: Unicode order (taling after base)
    source: "DERIVED-UTN47",
  },
  {
    latinPujl: "rawon",
    latinJgst: "rawon/",
    aksara: ak("RA WA TALING TARUNG NA PANGKON"), // v3: Unicode order (taling after base)
    source: "KAJ1-TRANS",
  },
  {
    latinPujl: "ngombé",
    latinJgst: "ṅombé",
    aksara: ak("NGA TALING TARUNG MA PANGKON BA TALING"), // v3: Unicode order (taling after base)
    source: "KAJ1-TRANS",
  },
  {
    latinPujl: "gendong",
    latinJgst: "gěndoŋ",
    aksara: ak("GA PEPET NA PANGKON DA TALING TARUNG CECAK"), // v3: Unicode order (taling after base)
    source: "DERIVED-UTN47",
    pujlRoundTrips: false, // bare e in PUJL input is ambiguous
  },
];
