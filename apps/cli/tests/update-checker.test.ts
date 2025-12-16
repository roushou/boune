import { describe, expect, test } from "bun:test";

// Test version comparison logic directly
function compareVersions(current: string, latest: string): boolean {
  const parse = (v: string) => v.replace(/^v/, "").split(".").map(Number);
  const [currMajor = 0, currMinor = 0, currPatch = 0] = parse(current);
  const [latestMajor = 0, latestMinor = 0, latestPatch = 0] = parse(latest);

  if (latestMajor > currMajor) return true;
  if (latestMajor === currMajor && latestMinor > currMinor) return true;
  if (latestMajor === currMajor && latestMinor === currMinor && latestPatch > currPatch)
    return true;
  return false;
}

describe("version comparison", () => {
  test("detects major version update", () => {
    expect(compareVersions("1.0.0", "2.0.0")).toBe(true);
    expect(compareVersions("0.8.0", "1.0.0")).toBe(true);
  });

  test("detects minor version update", () => {
    expect(compareVersions("1.0.0", "1.1.0")).toBe(true);
    expect(compareVersions("1.5.0", "1.6.0")).toBe(true);
  });

  test("detects patch version update", () => {
    expect(compareVersions("1.0.0", "1.0.1")).toBe(true);
    expect(compareVersions("1.0.5", "1.0.10")).toBe(true);
  });

  test("returns false when current is same as latest", () => {
    expect(compareVersions("1.0.0", "1.0.0")).toBe(false);
    expect(compareVersions("0.8.0", "0.8.0")).toBe(false);
  });

  test("returns false when current is newer", () => {
    expect(compareVersions("2.0.0", "1.0.0")).toBe(false);
    expect(compareVersions("1.1.0", "1.0.0")).toBe(false);
    expect(compareVersions("1.0.1", "1.0.0")).toBe(false);
  });

  test("handles v prefix", () => {
    expect(compareVersions("v1.0.0", "v2.0.0")).toBe(true);
    expect(compareVersions("v1.0.0", "2.0.0")).toBe(true);
    expect(compareVersions("1.0.0", "v2.0.0")).toBe(true);
  });
});
