import {
  murdaFor,
  nglegenaById,
  sandhanganById,
  type SandhanganFunction,
} from "../../engine/index.ts";
import type { MessageKey } from "../../l10n/i18n.ts";
import { pasanganString } from "./chart-catalog.ts";

export interface NglegenaDetail {
  readonly id: string;
  readonly name: string;
  readonly pujl: string;
  readonly jgst: string;
  readonly pasanganDemo: string;
  readonly murda: string | null;
}

export interface SandhanganDetail {
  readonly id: string;
  readonly name: string;
  readonly function: SandhanganFunction;
  readonly pujl: string;
  readonly jgst: string;
}

export function detailForNglegena(baseId: string): NglegenaDetail {
  const a = nglegenaById(baseId);
  if (a === null) throw new RangeError(`unknown nglegena: ${baseId}`);
  return {
    id: a.id,
    name: a.id,
    pujl: a.latinPujl,
    jgst: a.latinJgst,
    pasanganDemo: pasanganString(a.id),
    murda: murdaFor(baseId)?.aksara.char ?? null,
  };
}

export function detailForSandhangan(id: string): SandhanganDetail {
  const s = sandhanganById(id);
  if (s === null) throw new RangeError(`unknown sandhangan: ${id}`);
  return {
    id,
    name: id,
    function: s.function,
    pujl: s.latinPujl,
    jgst: s.latinJgst,
  };
}

/** The engine enum name is an identifier, never user-facing text. */
export function sandhanganFunctionMessageKey(
  f: SandhanganFunction,
): MessageKey {
  switch (f) {
    case "vowelChanging":
      return "functionVowelChanging";
    case "syllableClosing":
      return "functionSyllableClosing";
    case "consonantModifying":
      return "functionConsonantModifying";
    case "vowelKiller":
      return "functionVowelKiller";
  }
}
