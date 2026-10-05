import React from "react";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ getRepoStats: vi.fn(), generateReadme: vi.fn(), repoSnapshot: vi.fn() }));
vi.mock("../api/client", () => ({ api: { getRepoStats: mock.getRepoStats, generateReadme: mock.generateReadme } }));
vi.mock("../api/repoContext", () => ({ repoSnapshot: mock.repoSnapshot }));
import RepositoryInsights from "./RepositoryInsights";

let renderer;
const repository = { owner: "demo", repo: "vpn", fullName: "demo/vpn" };
const text = (node) => typeof node === "string" ? node : node.children?.map(text).join("") || "";
const button = (name) => renderer.root.findAllByType("button").find((node) => text(node) === name);
const render = () => act(async () => { renderer = create(<RepositoryInsights repository={repository} token="" />); });

beforeEach(() => {
  vi.resetAllMocks();
  mock.getRepoStats.mockResolvedValue({ stars: 1200, forks: 30, open_issues: 4, subscribers: 9, default_branch: "main", description: "A VPN app",
    languages: [{ name: "Kotlin", bytes: 900, percentage: 90 }, { name: "HTML", bytes: 100, percentage: 10 }] });
});
afterEach(() => act(() => renderer?.unmount()));

describe("Repository insights", () => {
  it("shows live GitHub analytics", async () => {
    await render();
    const content = text(renderer.root);
    expect(content).toContain("1,200");
    expect(content).toContain("Kotlin90%");
    expect(mock.getRepoStats).toHaveBeenCalledWith("demo", "vpn", "");
  });

  it("generates a README from the repository's key files", async () => {
    mock.repoSnapshot.mockResolvedValue({ description: "A VPN app", file_list: ["README.md", "server.py"], key_files: [{ path: "server.py", content: "run()" }] });
    mock.generateReadme.mockResolvedValue({ readme_markdown: "# VPN\n\nSecure tunnel." });
    await render();
    await act(async () => button("Generate README").props.onClick());
    expect(mock.generateReadme).toHaveBeenCalledWith("demo/vpn", "A VPN app", ["Kotlin", "HTML"], ["File: README.md", "File: server.py"], ["// server.py\nrun()"]);
    expect(text(renderer.root)).toContain("Secure tunnel.");
  });

  it("reports GitHub fetch errors instead of an empty README", async () => {
    mock.repoSnapshot.mockResolvedValue({ repository: "demo/vpn", fetch_error: "Repository not found or private." });
    await render();
    await act(async () => button("Generate README").props.onClick());
    expect(text(renderer.root)).toContain("Repository not found or private.");
    expect(mock.generateReadme).not.toHaveBeenCalled();
  });
});
