import { readdirSync, readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, test } from "vitest";
import { toAksara } from "../../../src/engine/index.ts";
import {
  ENGINE_MESSAGES,
  localizeEngineMessage,
} from "../../../src/features/converter/engine-messages.ts";
import en from "../../../src/l10n/en.json";
import { formatMessage, type MessageKey } from "../../../src/l10n/i18n.ts";
import id from "../../../src/l10n/id.json";

const ENGINE = new URL("../../../src/engine/", import.meta.url);

/** The message text of an expression, with each substitution written `${}`. */
function normalize(expr: ts.Expression): string | null {
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
    return expr.text;
  }
  if (ts.isParenthesizedExpression(expr)) return normalize(expr.expression);
  if (
    ts.isBinaryExpression(expr) &&
    expr.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    const left = normalize(expr.left);
    const right = normalize(expr.right);
    return left === null || right === null ? null : left + right;
  }
  if (ts.isTemplateExpression(expr)) {
    return (
      expr.head.text +
      expr.templateSpans.map((s) => "${}" + s.literal.text).join("")
    );
  }
  return null;
}

interface Scan {
  messages: Set<string>;
  forwards: string[];
  unsupported: string[];
}

function scanEngine(): Scan {
  const scan: Scan = { messages: new Set(), forwards: [], unsupported: [] };
  const files = (readdirSync(ENGINE, { recursive: true }) as string[])
    .map((p) => p.replaceAll("\\", "/"))
    .filter((p) => p.endsWith(".ts"))
    .sort();
  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      readFileSync(new URL(file, ENGINE), "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const collect = (expr: ts.Expression) => {
      if (expr.getText(source) === "e.message") {
        scan.forwards.push(file);
        return;
      }
      const text = normalize(expr);
      if (text === null) {
        const { line } = source.getLineAndCharacterOfPosition(expr.getStart());
        scan.unsupported.push(`${file}:${line + 1}: ${expr.getText(source)}`);
      } else {
        scan.messages.add(text);
      }
    };
    const visit = (node: ts.Node) => {
      if (
        ts.isNewExpression(node) &&
        node.expression.getText(source) === "LatinParseError" &&
        node.arguments?.[1] !== undefined
      ) {
        collect(node.arguments[1]);
      }
      if (
        ts.isPropertyAssignment(node) &&
        (node.name.getText(source) === "message" ||
          node.name.getText(source) === "reason")
      ) {
        collect(node.initializer);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return scan;
}

describe("engine message table", () => {
  test("[P-U09] every engine message is mapped (source-derived)", () => {
    const scan = scanEngine();
    expect(scan.unsupported, "unsupported message expression").toEqual([]);
    expect(scan.forwards, "e.message forward sites").toHaveLength(2);
    const mapped = new Set(ENGINE_MESSAGES.map((e) => e.source));
    const untranslated = [...scan.messages].filter((m) => !mapped.has(m));
    const stale = [...mapped].filter((m) => !scan.messages.has(m));
    expect(
      untranslated.map((m) => `untranslated engine message: ${m}`),
    ).toEqual([]);
    expect(stale.map((m) => `stale row: ${m}`)).toEqual([]);
    expect(ENGINE_MESSAGES).toHaveLength(15);
  });

  test("[P-U09] every message of the Dart fixture resolves to a specific key", () => {
    const fixture = JSON.parse(
      readFileSync(
        new URL("../../engine/fixtures/dart-ebc7cb5.json", import.meta.url),
        "utf8",
      ),
    ) as {
      toAksara: [string, boolean, unknown[]][];
      toLatin: [string, string, unknown[]][];
    };
    const texts = new Set<string>();
    for (const record of [...fixture.toAksara, ...fixture.toLatin]) {
      const result = record[2];
      if (result[0] === "e") texts.add(result[2] as string);
      if (result[0] === "a") texts.add(result[1] as string);
    }
    expect(texts.size).toBeGreaterThanOrEqual(10);
    for (const text of texts) {
      expect(localizeEngineMessage(text).key, text).not.toBe(
        "engineErrorGeneric",
      );
    }
  });

  test("[P-U09] the 04b deviation resolves to the cluster-closes-syllable key", () => {
    const result = toAksara("ka" + "ŕ");
    expect(result.kind).toBe("error");
    if (result.kind !== "error") return;
    expect(localizeEngineMessage(result.message).key).toBe(
      "engineErrorClusterClosesSyllable",
    );
  });
});

const SAMPLES: [string, ReturnType<typeof localizeEngineMessage>][] = [
  [
    'Unknown character "q"',
    { key: "engineErrorUnknownCharacter", params: { char: "q" } },
  ],
  [
    'Unknown character """',
    { key: "engineErrorUnknownCharacter", params: { char: '"' } },
  ],
  [
    'Unknown character "\t"',
    { key: "engineErrorUnknownCharacter", params: { char: "U+0009" } },
  ],
  [
    'Unknown character "\u200B"',
    { key: "engineErrorUnknownCharacter", params: { char: "U+200B" } },
  ],
  [
    'Unknown character "\u{1F600}"',
    { key: "engineErrorUnknownCharacter", params: { char: "\u{1F600}" } },
  ],
  [
    "Unrecognized codepoint U+A9E0",
    {
      key: "engineErrorUnrecognizedCodepoint",
      params: { codepoint: "U+A9E0" },
    },
  ],
];

describe("localizeEngineMessage", () => {
  test.each(SAMPLES)("[P-U09] parameters: %j", (text, expected) => {
    expect(localizeEngineMessage(text)).toEqual(expected);
  });

  test("[P-U09] an unknown message falls back to the generic key", () => {
    const result = localizeEngineMessage("Something the engine never said");
    expect(result).toEqual({ key: "engineErrorGeneric" });
    expect(result.params).toBeUndefined();
  });

  test("[P-U09] the bare-e internal invariant maps to the generic key on purpose", () => {
    expect(
      localizeEngineMessage(
        "Bare e reached the renderer; ambiguity must be resolved first",
      ).key,
    ).toBe("engineErrorGeneric");
  });
});

describe("engine message locales", () => {
  const keys = new Set<MessageKey>([
    "engineErrorGeneric",
    ...ENGINE_MESSAGES.map((e) => e.key),
  ]);
  const placeholders = (value: string) =>
    [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

  test.each([...keys])("[P-U09] %s exists in both locales", (key) => {
    expect(id[key]).toBeTypeOf("string");
    expect(en[key]).toBeTypeOf("string");
  });

  test("[P-U09] placeholders match each row's param, in both locales", () => {
    for (const entry of ENGINE_MESSAGES) {
      const expected = entry.param === undefined ? [] : [entry.param];
      expect(placeholders(id[entry.key]), entry.key).toEqual(expected);
      expect(placeholders(en[entry.key]), entry.key).toEqual(expected);
    }
  });

  test("[P-U09] every sample renders without throwing", () => {
    for (const [text] of SAMPLES) {
      const { key, params } = localizeEngineMessage(text);
      expect(() => formatMessage(id[key], params)).not.toThrow();
      expect(() => formatMessage(en[key], params)).not.toThrow();
    }
  });
});
