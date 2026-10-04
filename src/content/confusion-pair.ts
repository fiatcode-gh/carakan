import { ContentFormatError, type JsonObject } from "./content-format-error.ts";

/**
 * One confusion pair (spec 7: mistake log keyed by confusion pair).
 * Members are sorted so the key is canonical: 'da-dha', never 'dha-da'.
 */
export class ConfusionPair {
  readonly a: string;
  readonly b: string;
  readonly label: string;

  constructor(init: { a: string; b: string; label: string }) {
    this.a = init.a;
    this.b = init.b;
    this.label = init.label;
  }

  get key(): string {
    return `${this.a}-${this.b}`;
  }

  static fromJson(json: JsonObject): ConfusionPair {
    const members = json["members"] ?? [];
    const { label } = json;
    if (
      !Array.isArray(members) ||
      members.length !== 2 ||
      typeof label !== "string"
    ) {
      throw new ContentFormatError(
        `confusion pair needs members[2] and label: ${JSON.stringify(json)}`,
      );
    }
    if (typeof members[0] !== "string" || typeof members[1] !== "string") {
      throw new ContentFormatError("confusion pair members must be strings");
    }
    // Default sort compares UTF-16 code units, like Dart's String.compareTo.
    const [a, b] = [members[0], members[1]].sort() as [string, string];
    return new ConfusionPair({ a, b, label });
  }

  other(member: string): string {
    return member === this.a ? this.b : member === this.b ? this.a : member;
  }

  contains(member: string): boolean {
    return member === this.a || member === this.b;
  }
}
