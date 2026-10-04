/** Thrown when a content JSON entry or file is malformed. */
export class ContentFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentFormatError";
  }
}

export type JsonObject = Record<string, unknown>;

export function asObject(value: unknown, what: string): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ContentFormatError(`${what} must be an object`);
  }
  return value as JsonObject;
}

export function asArray(value: unknown, what: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new ContentFormatError(`${what} must be a list`);
  }
  return value;
}

/** A string field that may be absent or null. */
export function optionalString(json: JsonObject, key: string): string | null {
  const value = json[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new ContentFormatError(`${key} must be a string`);
  }
  return value;
}

/** A list of strings; absent or null is the empty list. */
export function stringList(json: JsonObject, key: string): string[] {
  const value = json[key];
  if (value === undefined || value === null) return [];
  return asArray(value, key).map((entry) => {
    if (typeof entry !== "string") {
      throw new ContentFormatError(`${key} entries must be strings`);
    }
    return entry;
  });
}
