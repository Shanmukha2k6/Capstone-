import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, create } from "react-test-renderer";

const mock = vi.hoisted(() => ({ getRepoTree: vi.fn(), getRepoFile: vi.fn(), getTopicRepos: vi.fn() }));
vi.mock("../api/client", () => ({ api: mock }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ githubToken: "", saveGithubToken: vi.fn() }) }));
import RepoExplorer from "./RepoExplorer";

let renderer, open;
const text = (node) => typeof node === "string" ? node : node.children?.map(text).join("") || "";
const button = (name) => renderer.root.findAllByType("button").find((node) => text(node) === name);
const input = () => renderer.root.findByProps({ "aria-label": "GitHub repository or topic" });
const change = (value) => act(() => input().props.onChange({ target: { value } }));
const load = () => act(async () => { renderer.root.findByType("form").props.onSubmit({ preventDefault() {} }); });
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };

beforeEach(() => {
  vi.resetAllMocks();
  open = vi.fn();
  mock.getRepoTree.mockResolvedValue([{ path: "src/main.py", type: "blob" }]);
  mock.getRepoFile.mockResolvedValue({ content: "print('actual source')" });
  act(() => { renderer = create(<RepoExplorer onOpenInWorkspace={open} />); });
});
afterEach(() => act(() => renderer.unmount()));

describe("repository source selection", () => {
  it("uses the loaded repository when the search input is edited, and forwards the real source", async () => {
    change("https://github.com/demo/project"); await load();
    change("another/repository");
    await act(async () => button("src/main.py").props.onClick());
    expect(mock.getRepoFile).toHaveBeenCalledWith("demo", "project", "src/main.py", "");
    act(() => button("Analyze in Workspace").props.onClick());
    expect(open).toHaveBeenCalledWith({ code: "print('actual source')", language: "python", tool: "bugs" });
  });
  it("shows a repository picker for topic URLs and loads the chosen repository", async () => {
    mock.getTopicRepos.mockResolvedValue({ topic: "open-source-project", total_count: 1, repositories: [{ full_name: "demo/project", stars: 4 }] });
    change("https://github.com/topics/open-source-project"); await load();
    expect(mock.getRepoTree).not.toHaveBeenCalled();
    const choice = renderer.root.findAllByType("button").find((node) => text(node).startsWith("demo/project"));
    await act(async () => choice.props.onClick());
    expect(mock.getRepoTree).toHaveBeenCalledWith("demo", "project", null, "");
    expect(input().props.value).toBe("demo/project");
  });
  it("disables analysis during a file load and after failures", async () => {
    const file = deferred(); mock.getRepoFile.mockReturnValue(file.promise);
    await load();
    await act(async () => { button("src/main.py").props.onClick(); });
    expect(button("Analyze in Workspace").props.disabled).toBe(true);
    await act(async () => file.resolve({ content: "print(1)" }));
    expect(button("Analyze in Workspace").props.disabled).toBe(false);
    mock.getRepoFile.mockRejectedValue(new Error("GitHub rate limit reached"));
    await act(async () => button("src/main.py").props.onClick());
    expect(button("Analyze in Workspace").props.disabled).toBe(true);
    expect(renderer.root.findByProps({ role: "alert" }).children).toContain("GitHub rate limit reached");
    act(() => button("Analyze in Workspace").props.onClick());
    expect(open).not.toHaveBeenCalled();
  });
  it("ignores a delayed file response after switching repositories", async () => {
    const oldFile = deferred(); mock.getRepoFile.mockReturnValue(oldFile.promise);
    await load(); await act(async () => { button("src/main.py").props.onClick(); });
    change("second/project"); await load();
    mock.getRepoFile.mockResolvedValue({ content: "print('second repository')" });
    await act(async () => button("src/main.py").props.onClick());
    await act(async () => oldFile.resolve({ content: "print('stale first repository')" }));
    act(() => button("Analyze in Workspace").props.onClick());
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ code: "print('second repository')" }));
  });
});
