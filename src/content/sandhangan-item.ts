import { javaneseChar } from "../engine/index.ts";
import {
  ContentFormatError,
  optionalString,
  type JsonObject,
} from "./content-format-error.ts";

/**
 * One chart item from sandhangan.json. `function` is the engine enum name
 * (vowelChanging | syllableClosing | consonantModifying | vowelKiller).
 */
export class SandhanganItem {
  readonly id: string;
  readonly name: string;
  readonly unicodeName: string;
  readonly function: string;
  readonly latinPujl: string;
  readonly latinJgst: string;
  readonly audioKey: string;

  constructor(init: {
    id: string;
    name: string;
    unicodeName: string;
    function: string;
    latinPujl: string;
    latinJgst: string;
    audioKey: string;
  }) {
    this.id = init.id;
    this.name = init.name;
    this.unicodeName = init.unicodeName;
    this.function = init.function;
    this.latinPujl = init.latinPujl;
    this.latinJgst = init.latinJgst;
    this.audioKey = init.audioKey;
  }

  /**
   * The sign on a HA carrier. Every sandhangan is a combining mark, so shown
   * alone it draws a dotted circle; previews and tiles use this instead.
   */
  get carrierChar(): string {
    return javaneseChar("JAVANESE LETTER HA") + javaneseChar(this.unicodeName);
  }

  static fromJson(json: JsonObject): SandhanganItem {
    const { id, name, unicodeName } = json;
    const fn = json["function"];
    if (
      typeof id !== "string" ||
      typeof name !== "string" ||
      typeof unicodeName !== "string" ||
      typeof fn !== "string"
    ) {
      throw new ContentFormatError(
        `sandhangan item needs id/name/unicodeName/function: ${JSON.stringify(json)}`,
      );
    }
    return new SandhanganItem({
      id,
      name,
      unicodeName,
      function: fn,
      latinPujl: optionalString(json, "latinPujl") ?? "",
      latinJgst: optionalString(json, "latinJgst") ?? "",
      audioKey: optionalString(json, "audioKey") ?? id,
    });
  }
}
