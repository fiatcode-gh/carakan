import {
  kajRulesetId,
  pedomanRulesetId,
  type RulesetId,
} from "../engine/index.ts";
import type { MessageKey } from "./i18n.ts";

/** The per-ruleset UI copy: the ruleset's name and its About rule sources. */
export const RULESET_MESSAGES: Readonly<
  Record<RulesetId, { readonly name: MessageKey; readonly sources: MessageKey }>
> = {
  [pedomanRulesetId]: {
    name: "rulesetNamePedoman",
    sources: "ruleSourceBodyPedoman",
  },
  [kajRulesetId]: { name: "rulesetNameKaj", sources: "ruleSourceBodyKaj" },
};
