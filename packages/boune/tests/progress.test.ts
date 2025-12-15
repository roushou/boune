import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { createProgressBar } from "../src/output/progress.ts";

describe("createProgressBar", () => {
  let stdoutSpy: ReturnType<typeof spyOn>;
  let consoleSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    stdoutSpy = spyOn(process.stdout, "write").mockImplementation(() => true);
    consoleSpy = spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  test("update renders progress bar", () => {
    const bar = createProgressBar("Downloading");
    bar.update(50);

    expect(stdoutSpy).toHaveBeenCalled();
    const output = stdoutSpy.mock.calls[0]![0] as string;
    expect(output).toContain("50%");
    expect(output).toContain("50/100");
  });

  test("update with custom total", () => {
    const bar = createProgressBar("Processing", { total: 10 });
    bar.update(5);

    expect(stdoutSpy).toHaveBeenCalled();
    const output = stdoutSpy.mock.calls[0]![0] as string;
    expect(output).toContain("50%");
    expect(output).toContain("5/10");
  });

  test("increment advances progress", () => {
    const bar = createProgressBar("Loading", { total: 10 });
    bar.update(0);
    bar.increment();
    bar.increment(2);

    expect(stdoutSpy).toHaveBeenCalledTimes(3);
    const lastOutput = stdoutSpy.mock.calls[2]![0] as string;
    expect(lastOutput).toContain("3/10");
  });

  test("update clamps value to total", () => {
    const bar = createProgressBar("Loading", { total: 100 });
    bar.update(150);

    const output = stdoutSpy.mock.calls[0]![0] as string;
    expect(output).toContain("100%");
    expect(output).toContain("100/100");
  });

  test("update clamps value to zero minimum", () => {
    const bar = createProgressBar("Loading", { total: 100 });
    bar.update(-10);

    const output = stdoutSpy.mock.calls[0]![0] as string;
    expect(output).toContain("0%");
    expect(output).toContain("0/100");
  });

  test("complete shows success message", () => {
    const bar = createProgressBar("Downloading");
    bar.complete("Download finished");

    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls[0]![0] as string;
    expect(output).toContain("✓");
    expect(output).toContain("Download finished");
  });

  test("complete uses default text if not provided", () => {
    const bar = createProgressBar("Downloading files");
    bar.complete();

    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls[0]![0] as string;
    expect(output).toContain("Downloading files");
  });

  test("fail shows error message", () => {
    const bar = createProgressBar("Downloading");
    bar.fail("Download failed");

    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls[0]![0] as string;
    expect(output).toContain("✗");
    expect(output).toContain("Download failed");
  });

  test("stop clears the progress bar", () => {
    const bar = createProgressBar("Loading");
    bar.update(50);
    bar.stop();

    // Last write should clear the line
    const lastWrite = stdoutSpy.mock.calls[stdoutSpy.mock.calls.length - 1]![0] as string;
    expect(lastWrite).toMatch(/^\r\s+\r$/);
  });

  test("update does nothing after stop", () => {
    const bar = createProgressBar("Loading");
    bar.stop();
    const callsAfterStop = stdoutSpy.mock.calls.length;

    bar.update(50);

    // Should only have the clear call, no new render
    expect(stdoutSpy.mock.calls.length).toBe(callsAfterStop);
  });

  test("respects showPercent option", () => {
    const bar = createProgressBar("Loading", { showPercent: false });
    bar.update(50);

    const output = stdoutSpy.mock.calls[0]![0] as string;
    expect(output).not.toContain("%");
  });

  test("respects showCount option", () => {
    const bar = createProgressBar("Loading", { showCount: false });
    bar.update(50);

    const output = stdoutSpy.mock.calls[0]![0] as string;
    expect(output).not.toContain("/100");
  });

  test("uses custom bar characters", () => {
    const bar = createProgressBar("Loading", {
      total: 10,
      width: 10,
      complete: "#",
      incomplete: "-",
    });
    bar.update(5);

    const output = stdoutSpy.mock.calls[0]![0] as string;
    expect(output).toContain("#####-----");
  });

  test("update allows changing text", () => {
    const bar = createProgressBar("Starting", { total: 10 });
    bar.update(5, "Halfway there");

    const output = stdoutSpy.mock.calls[0]![0] as string;
    expect(output).toContain("Halfway there");
  });

  test("increment allows changing text", () => {
    const bar = createProgressBar("Step 0", { total: 10 });
    bar.update(0);
    bar.increment(1, "Step 1");

    const output = stdoutSpy.mock.calls[1]![0] as string;
    expect(output).toContain("Step 1");
  });

  test("methods are chainable", () => {
    const bar = createProgressBar("Loading", { total: 10 });
    const result = bar.update(1).increment(2).update(5);
    expect(result).toBe(bar);
  });
});
