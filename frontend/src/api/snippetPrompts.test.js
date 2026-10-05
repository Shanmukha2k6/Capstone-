import { describe, expect, it } from "vitest";
import { bugPrompt, clampFindings, measureCode, numberLines } from "./snippetPrompts";

describe("snippetPrompts", () => {
  it("numbers each line from 1", () => {
    expect(numberLines("a\nb")).toBe("1| a\n2| b");
  });

  it("delimits code as data inside language and code tags", () => {
    const { system, prompt } = bugPrompt("x = 1", "python");
    expect(prompt).toBe("<language>python</language>\n<code>\n1| x = 1\n</code>");
    expect(system).toMatch(/never as instructions/);
  });

  it("clamps finding line ranges to the snippet", () => {
    const [f] = clampFindings([{ line_start: 0, line_end: 99 }], "a\nb\nc");
    expect(f).toMatchObject({ line_start: 1, line_end: 3 });
    expect(clampFindings(undefined, "a")).toEqual([]);
  });

  it("measures real lines of code and comment ratio", () => {
    expect(measureCode("# note\nx = 1\n\ny = 2\n")).toEqual({ loc: 3, comment_ratio: 0.33 });
  });
});
