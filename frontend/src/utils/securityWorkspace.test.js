import { describe, it, expect } from "vitest";
import { evidenceId, createReview, compareReviews, workspaceMetrics, validateDecision, reviewMarkdown, decisionId } from "./securityWorkspace";

const finding = (path = "install.js", evidence = "send(process.env)") => ({ file_path: path, line_start: 2, line_end: 2, title: "Environment data transfer", severity: "high", category: "data_exfiltration", evidence, explanation: "Data leaves the host.", recommendation: "Inspect the destination." });
const report = (findings = [finding()], files = ["install.js"]) => ({ repository: "demo/project", revision: "a".repeat(40), provider: "gemini", model: "model", verdict: "suspicious", summary: "Review source indicators.", findings, analyzed_files: files, eligible_files: 3, skipped_count: 2, skipped_files: [{ path: "other.js", reason: "file limit" }], limitations: ["Static review only."] });

describe("saved security reviews", () => {
  it("fingerprints evidence consistently when line positions move", async () => {
    expect(await evidenceId(finding())).toBe(await evidenceId({ ...finding(), line_start: 20, line_end: 20, title: "Different wording" }));
    expect(await evidenceId(finding())).not.toBe(await evidenceId(finding("another.js")));
  });
  it("keeps files outside new coverage separate from absent indicators", async () => {
    const previous = await createReview("p", report([finding(), finding("other.js")], ["install.js", "other.js"]));
    const current = await createReview("p", report([], ["install.js"]));
    expect(compareReviews(current, previous)).toEqual({ added: 0, repeated: 0, notObserved: 1, outsideCoverage: 1 });
  });
  it("calculates the queue from latest reviews and actual reviewer decisions", async () => {
    const older = { ...await createReview("p", report([finding(), finding("other.js")])), createdAt: "2026-01-01" };
    const latest = { ...await createReview("p", report()), createdAt: "2026-02-01" };
    expect(workspaceMetrics([{ id: "p" }], [older, latest], {})).toEqual({ projects: 1, reviews: 2, open: 1, high: 1 });
    const decisions = { [decisionId(latest.id, latest.findingIds[0])]: { status: "resolved", note: "Verified removal." } };
    expect(workspaceMetrics([{ id: "p" }], [older, latest], decisions).open).toBe(0);
    const markdown = reviewMarkdown(latest, decisions, older);
    expect(markdown).toContain("Verified removal."); expect(markdown).toContain(`blob/${"a".repeat(40)}/install.js#L2-L2`);
    expect(markdown).toContain("Absence of an indicator is not proof of a fix"); expect(markdown).toContain("Static review only.");
  });
  it("rejects demo reviews and unexplained risk/fix dispositions", async () => {
    await expect(createReview("p", { ...report(), provider: "mock" })).rejects.toThrow("Only completed Gemini");
    expect(() => validateDecision("resolved", " ")).toThrow("Add a note");
    expect(() => validateDecision("accepted_risk", "")).toThrow("Add a note");
    expect(() => validateDecision("open", "")).not.toThrow();
  });
});
