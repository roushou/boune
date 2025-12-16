import { type SelectOption, formatConfig, getVariableName } from "../src/commands/playground.ts";
import { describe, expect, test } from "bun:test";
import { join } from "node:path";

describe("playground command", () => {
  describe("getVariableName", () => {
    test("returns 'answer' for text prompt", () => {
      expect(getVariableName("text")).toBe("answer");
    });

    test("returns 'confirmed' for confirm prompt", () => {
      expect(getVariableName("confirm")).toBe("confirmed");
    });

    test("returns 'selected' for select prompt", () => {
      expect(getVariableName("select")).toBe("selected");
    });

    test("returns 'selections' for multiselect prompt", () => {
      expect(getVariableName("multiselect")).toBe("selections");
    });
  });

  describe("formatConfig", () => {
    test("returns empty object for empty config", () => {
      expect(formatConfig({})).toBe("{}");
    });

    test("filters out undefined values", () => {
      const config = {
        message: "Enter name:",
        placeholder: undefined,
        default: undefined,
      };
      const result = formatConfig(config);
      expect(result).toContain('message: "Enter name:"');
      expect(result).not.toContain("placeholder");
      expect(result).not.toContain("default");
    });

    test("filters out empty string values", () => {
      const config = {
        message: "Enter name:",
        placeholder: "",
      };
      const result = formatConfig(config);
      expect(result).toContain('message: "Enter name:"');
      expect(result).not.toContain("placeholder");
    });

    test("formats string values with quotes", () => {
      const config = {
        message: "What is your name?",
        placeholder: "john_doe",
      };
      const result = formatConfig(config);
      expect(result).toContain('message: "What is your name?"');
      expect(result).toContain('placeholder: "john_doe"');
    });

    test("formats boolean values without quotes", () => {
      const config = {
        message: "Are you sure?",
        default: true,
      };
      const result = formatConfig(config);
      expect(result).toContain('message: "Are you sure?"');
      expect(result).toContain("default: true");
    });

    test("formats options array correctly", () => {
      const options: SelectOption[] = [
        { label: "Option A", value: "a" },
        { label: "Option B", value: "b", hint: "Second option" },
      ];
      const config = {
        message: "Select one:",
        options,
      };
      const result = formatConfig(config);
      expect(result).toContain('message: "Select one:"');
      expect(result).toContain("options: [");
      expect(result).toContain('label: "Option A"');
      expect(result).toContain('value: "a"');
      expect(result).toContain('label: "Option B"');
      expect(result).toContain('value: "b"');
      expect(result).toContain('hint: "Second option"');
    });

    test("omits hint from options when not provided", () => {
      const options: SelectOption[] = [{ label: "Option A", value: "a" }];
      const config = { message: "Select:", options };
      const result = formatConfig(config);
      expect(result).toContain('label: "Option A"');
      expect(result).toContain('value: "a"');
      // Should not have hint for this option
      const optionLine = result.split("\n").find((line) => line.includes("Option A"));
      expect(optionLine).not.toContain("hint:");
    });
  });

  describe("command registration", () => {
    test("playground command is registered and shows in help", async () => {
      const cliPath = join(import.meta.dir, "../src/app.ts");

      const proc = Bun.spawn(["bun", "run", cliPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const exitCode = await proc.exited;
      const stdout = await new Response(proc.stdout).text();

      expect(exitCode).toBe(0);
      expect(stdout).toContain("playground");
      expect(stdout).toContain("Interactively test and explore boune prompts");
    });

    test("playground command help shows correct description", async () => {
      const cliPath = join(import.meta.dir, "../src/app.ts");

      const proc = Bun.spawn(["bun", "run", cliPath, "playground", "--help"], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const exitCode = await proc.exited;
      const stdout = await new Response(proc.stdout).text();

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Interactively test and explore boune prompts");
    });
  });
});
