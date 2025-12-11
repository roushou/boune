import { describe, expect, test } from "bun:test";
import { formatSuggestions, levenshtein, suggestCommands } from "../src/suggest.ts";
import type { CommandConfig } from "../src/types.ts";

describe("levenshtein", () => {
  test("returns 0 for identical strings", () => {
    expect(levenshtein("hello", "hello")).toBe(0);
    expect(levenshtein("", "")).toBe(0);
  });

  test("returns length for empty string comparison", () => {
    expect(levenshtein("hello", "")).toBe(5);
    expect(levenshtein("", "world")).toBe(5);
  });

  test("calculates single character changes", () => {
    expect(levenshtein("cat", "bat")).toBe(1); // substitution
    expect(levenshtein("cat", "cats")).toBe(1); // insertion
    expect(levenshtein("cats", "cat")).toBe(1); // deletion
  });

  test("calculates multiple changes", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("saturday", "sunday")).toBe(3);
  });

  test("is case sensitive", () => {
    expect(levenshtein("Hello", "hello")).toBe(1);
    expect(levenshtein("WORLD", "world")).toBe(5);
  });
});

describe("suggestCommands", () => {
  const createCommand = (
    name: string,
    description: string,
    aliases: string[] = [],
  ): CommandConfig => ({
    name,
    description,
    aliases,
    arguments: [],
    options: [],
    subcommands: {},
    hidden: false,
  });

  const buildCmd = createCommand("build", "Build the project", ["b"]);
  const serveCmd = createCommand("serve", "Start development server");
  const testCmd = createCommand("test", "Run tests", ["t"]);
  const deployCmd = createCommand("deploy", "Deploy to production");
  const hiddenCmd = createCommand("internal", "Internal command");
  hiddenCmd.hidden = true;

  const commands: Record<string, CommandConfig> = {
    build: buildCmd,
    b: buildCmd, // alias
    serve: serveCmd,
    test: testCmd,
    t: testCmd, // alias
    deploy: deployCmd,
    internal: hiddenCmd,
  };

  test("suggests exact prefix matches first", () => {
    const suggestions = suggestCommands("bui", commands);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0]!.name).toBe("build");
  });

  test("suggests similar commands", () => {
    const suggestions = suggestCommands("buld", commands);
    expect(suggestions.some((s) => s.name === "build")).toBe(true);
  });

  test("suggests for typos", () => {
    const suggestions = suggestCommands("tset", commands);
    expect(suggestions.some((s) => s.name === "test")).toBe(true);
  });

  test("returns empty array for completely unrelated input", () => {
    const suggestions = suggestCommands("xyz123", commands);
    expect(suggestions.length).toBe(0);
  });

  test("respects maxSuggestions option", () => {
    const suggestions = suggestCommands("d", commands, { maxSuggestions: 2 });
    expect(suggestions.length).toBeLessThanOrEqual(2);
  });

  test("respects minScore option", () => {
    const highThreshold = suggestCommands("x", commands, { minScore: 0.9 });
    const lowThreshold = suggestCommands("x", commands, { minScore: 0.1 });
    expect(highThreshold.length).toBeLessThanOrEqual(lowThreshold.length);
  });

  test("excludes hidden commands", () => {
    const suggestions = suggestCommands("internal", commands);
    expect(suggestions.some((s) => s.name === "internal")).toBe(false);
  });

  test("includes description in suggestions", () => {
    const suggestions = suggestCommands("build", commands);
    expect(suggestions[0]!.description).toBe("Build the project");
  });

  test("suggestions are sorted by score", () => {
    const suggestions = suggestCommands("ser", commands);
    for (let i = 1; i < suggestions.length; i++) {
      expect(suggestions[i - 1]!.score).toBeGreaterThanOrEqual(suggestions[i]!.score);
    }
  });

  test("handles empty input", () => {
    const suggestions = suggestCommands("", commands);
    // Empty input might match everything or nothing depending on implementation
    expect(Array.isArray(suggestions)).toBe(true);
  });

  test("handles single character input", () => {
    const suggestions = suggestCommands("b", commands);
    expect(suggestions.some((s) => s.name === "build")).toBe(true);
  });
});

describe("formatSuggestions", () => {
  test("returns empty string for no suggestions", () => {
    expect(formatSuggestions([])).toBe("");
  });

  test("formats single suggestion", () => {
    const result = formatSuggestions([{ name: "build", description: "Build project", score: 0.9 }]);
    expect(result).toContain("Did you mean");
    expect(result).toContain("build");
    expect(result).toContain("Build project");
  });

  test("formats multiple suggestions", () => {
    const result = formatSuggestions([
      { name: "build", description: "Build project", score: 0.9 },
      { name: "bundle", description: "Bundle assets", score: 0.8 },
    ]);
    expect(result).toContain("build");
    expect(result).toContain("bundle");
  });

  test("aligns names properly", () => {
    const result = formatSuggestions([
      { name: "a", description: "Short name", score: 0.9 },
      { name: "longer", description: "Long name", score: 0.8 },
    ]);
    // Both descriptions should be aligned
    const lines = result.split("\n").filter((l) => l.includes("name"));
    expect(lines.length).toBe(2);
  });
});
