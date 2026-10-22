import type { AksaraChar } from "./aksara-char.ts";
import { murdaLinks, type MurdaLink } from "./murda.ts";
import { rekan, rekanById, rekanCatalogue, type Rekan } from "./rekan.ts";
import { swaraCatalogue, swaraLongForms, type SwaraLongForm } from "./swara.ts";

export type RulesetId = "pedoman-2002-v1" | "kaj1-2021-simplified-v3";

export const pedomanRulesetId: RulesetId = "pedoman-2002-v1";
export const kajRulesetId: RulesetId = "kaj1-2021-simplified-v3";
/** The ruleset a device without a saved choice uses (contract 2.1). */
export const defaultRulesetId: RulesetId = pedomanRulesetId;

export interface Ruleset {
  readonly id: RulesetId;
  /** Murda this ruleset writes and teaches, in chart order. */
  readonly murda: readonly MurdaLink[];
  /** Long swara forms shown in the chart and the glyph picker. */
  readonly swaraLongForms: readonly SwaraLongForm[];
  /** Data-only swara shown in the chart. */
  readonly swaraCatalogue: readonly AksaraChar[];
  /** Rekan shown in the chart, in chart order. */
  readonly rekan: readonly Rekan[];
}

/** Ped p.11 no.1: the seven murda the Pedoman keeps. */
const pedomanMurdaBases: ReadonlySet<string> = new Set([
  "na",
  "ka",
  "ta",
  "sa",
  "pa",
  "ga",
  "ba",
]);

function chartRekan(id: string): Rekan {
  const r = rekanById(id);
  if (r === null) throw new Error(`Unknown rekan ${id}`);
  return r;
}

/** One fa/va letter (Ped p.16): PA + cecak telu, id stays the universe id `fa`. */
const faVa: Rekan = { ...chartRekan("fa"), latinPujl: "fa/va" };

const pedoman: Ruleset = {
  id: pedomanRulesetId,
  murda: murdaLinks.filter((m) => pedomanMurdaBases.has(m.baseId)),
  swaraLongForms: [],
  swaraCatalogue: [],
  rekan: [
    ...rekanCatalogue.filter((r) => r.id === "kha" || r.id === "dza"),
    faVa,
    ...rekanCatalogue.filter((r) => r.id === "za" || r.id === "gha"),
  ],
};

const kaj: Ruleset = {
  id: kajRulesetId,
  murda: murdaLinks,
  swaraLongForms: [...swaraLongForms.values()],
  swaraCatalogue,
  rekan,
};

/** Settings order, default first. */
export const rulesets: readonly Ruleset[] = [pedoman, kaj];

export function rulesetById(id: RulesetId): Ruleset {
  return id === pedomanRulesetId ? pedoman : kaj;
}

export function isRulesetId(raw: unknown): raw is RulesetId {
  return raw === pedomanRulesetId || raw === kajRulesetId;
}
