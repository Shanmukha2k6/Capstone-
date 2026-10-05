import React from "react";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ reviewRepository: vi.fn() }));
vi.mock("../api/client", () => ({ api: mock }));
import RepositoryReview from "./RepositoryReview";

let renderer;
const repository = { owner: "demo", repo: "vpn", fullName: "demo/vpn" };
const text = (node) => typeof node === "string" ? node : node.children?.map(text).join("") || "";
const button = (name) => renderer.root.findAllByType("button").find((node) => text(node).includes(name));
const render = (onOpenSettings) => act(async () => { renderer = create(<RepositoryReview repository={repository} token="" onOpenSettings={onOpenSettings} />); });

beforeEach(() => vi.resetAllMocks());
afterEach(() => act(() => renderer?.unmount()));

describe("Repository code review", () => {
  it("runs a review and renders the score and findings sorted by severity", async () => {
    mock.reviewRepository.mockResolvedValue({ repository: "demo/vpn", default_branch: "main", model: "gemini-3.8-flash", score: 72,
      summary: "Solid overall.", strengths: ["Clear module boundaries"], analyzed_files: ["a.py"], file_count: 20,
      findings: [
        { title: "Minor naming", severity: "low", category: "style", file_path: "a.py", line_start: 2, line_end: 2, evidence: "x=1", explanation: "e", recommendation: "r" },
        { title: "SQL injection", severity: "critical", category: "security", file_path: "a.py", line_start: 1, line_end: 1, evidence: "q", explanation: "e", recommendation: "r" },
      ] });
    await render();
    await act(async () => button("Review repository").props.onClick());
    const content = text(renderer.root);
    expect(content).toContain("72");
    expect(content).toContain("Clear module boundaries");
    expect(content.indexOf("SQL injection")).toBeLessThan(content.indexOf("Minor naming"));
    expect(mock.reviewRepository).toHaveBeenCalledWith("demo", "vpn", "");
  });

  it("shows a settings shortcut when the Gemini key is missing", async () => {
    mock.reviewRepository.mockRejectedValue(new Error("Add your Gemini API key in Settings to run a repository code review."));
    const onOpenSettings = vi.fn();
    await render(onOpenSettings);
    await act(async () => button("Review repository").props.onClick());
    expect(text(renderer.root)).toContain("Gemini API key");
    await act(async () => button("Open Settings").props.onClick());
    expect(onOpenSettings).toHaveBeenCalled();
  });
});
