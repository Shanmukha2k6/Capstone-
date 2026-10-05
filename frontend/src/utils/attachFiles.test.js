import { describe, expect, it } from "vitest";
import { appendFilesToContext, attachedFileNames, CONTEXT_LIMIT } from "./attachFiles";
import { normalizeMalwareFinding } from "../api/client";
import { createReview } from "./securityWorkspace";

const file = (name, text) => new File([text], name, { type: "text/plain" });

describe("attachFiles", () => {
  it("adds text files as named blocks and skips binary or oversized files", async () => {
    const { context, skipped } = await appendFilesToContext([
      file("main.py", "print('hi')"), file("logo.png", "PNG\u0000data"), file("huge.js", "x".repeat(CONTEXT_LIMIT)),
    ], "note");
    expect(context).toBe("note\n\n<file name=\"main.py\">\nprint('hi')\n</file>");
    expect(attachedFileNames(context)).toEqual(["main.py"]);
    expect(skipped).toEqual(["logo.png (binary)", "huge.js (over the 20,000-character limit)"]);
  });
});

describe("browser-direct malware reports", () => {
  it("normalize findings so the review can be saved", async () => {
    const finding = normalizeMalwareFinding({ file_path: "a.py", evidence: " exec(x) ", severity: "info", category: "weird", confidence: "2" });
    expect(finding).toMatchObject({ evidence: "exec(x)", severity: "low", category: "other_suspicious_behavior", confidence: 1 });
    const review = await createReview("p1", { provider: "gemini", revision: "abc", findings: [finding] });
    expect(review.findingIds).toHaveLength(1);
  });
});
