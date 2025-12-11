import { coerceValue, parseArguments } from "../src/parser/args.ts";
import { describe, expect, test } from "bun:test";
import type { ArgumentDef } from "../src/types/index.ts";

describe("coerceValue", () => {
  test("coerces strings", () => {
    expect(coerceValue("hello", "string")).toEqual({ ok: true, value: "hello" });
  });

  test("coerces numbers", () => {
    expect(coerceValue("42", "number")).toEqual({ ok: true, value: 42 });
    expect(coerceValue("3.14", "number")).toEqual({ ok: true, value: 3.14 });
    expect(coerceValue("-10", "number")).toEqual({ ok: true, value: -10 });
  });

  test("rejects invalid numbers", () => {
    const result = coerceValue("abc", "number");
    expect(result.ok).toBe(false);
  });

  test("coerces booleans", () => {
    expect(coerceValue("true", "boolean")).toEqual({ ok: true, value: true });
    expect(coerceValue("false", "boolean")).toEqual({ ok: true, value: false });
    expect(coerceValue("yes", "boolean")).toEqual({ ok: true, value: true });
    expect(coerceValue("no", "boolean")).toEqual({ ok: true, value: false });
    expect(coerceValue("1", "boolean")).toEqual({ ok: true, value: true });
    expect(coerceValue("0", "boolean")).toEqual({ ok: true, value: false });
  });

  test("rejects invalid booleans", () => {
    const result = coerceValue("maybe", "boolean");
    expect(result.ok).toBe(false);
  });
});

describe("parseArguments", () => {
  test("parses required arguments", () => {
    const defs: ArgumentDef[] = [
      { name: "name", description: "Name", required: true, type: "string" },
    ];
    const { args, errors } = parseArguments(["test"], defs);
    expect(args).toEqual({ name: "test" });
    expect(errors).toEqual([]);
  });

  test("reports missing required arguments", () => {
    const defs: ArgumentDef[] = [
      { name: "name", description: "Name", required: true, type: "string" },
    ];
    const { errors } = parseArguments([], defs);
    expect(errors.length).toBe(1);
    expect(errors[0]?.type).toBe("missing_required");
  });

  test("applies default values", () => {
    const defs: ArgumentDef[] = [
      { name: "name", description: "Name", required: false, type: "string", default: "default" },
    ];
    const { args, errors } = parseArguments([], defs);
    expect(args).toEqual({ name: "default" });
    expect(errors).toEqual([]);
  });

  test("parses multiple arguments", () => {
    const defs: ArgumentDef[] = [
      { name: "src", description: "Source", required: true, type: "string" },
      { name: "dest", description: "Destination", required: true, type: "string" },
    ];
    const { args, errors } = parseArguments(["a.txt", "b.txt"], defs);
    expect(args).toEqual({ src: "a.txt", dest: "b.txt" });
    expect(errors).toEqual([]);
  });

  test("parses variadic arguments", () => {
    const defs: ArgumentDef[] = [
      { name: "files", description: "Files", required: true, type: "string", variadic: true },
    ];
    const { args, errors } = parseArguments(["a.txt", "b.txt", "c.txt"], defs);
    expect(args).toEqual({ files: ["a.txt", "b.txt", "c.txt"] });
    expect(errors).toEqual([]);
  });

  test("coerces argument types", () => {
    const defs: ArgumentDef[] = [
      { name: "count", description: "Count", required: true, type: "number" },
    ];
    const { args, errors } = parseArguments(["42"], defs);
    expect(args).toEqual({ count: 42 });
    expect(errors).toEqual([]);
  });
});
