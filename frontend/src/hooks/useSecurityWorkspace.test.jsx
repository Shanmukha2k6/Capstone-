import React from "react";
import { act, create } from "react-test-renderer";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
const mock = vi.hoisted(() => ({ auth: { user: null, loading: false }, subscribe: vi.fn(), save: vi.fn(), listeners: [] }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => mock.auth }));
vi.mock("../firebase/security", () => ({ subscribeSecurity: mock.subscribe, saveSecurityRecord: mock.save }));
import { useSecurityWorkspace } from "./useSecurityWorkspace";
let renderer, workspace;
function Probe() { workspace = useSecurityWorkspace(); return null; }
const render = () => act(() => { renderer = create(<Probe />); });
const repository = { owner: "demo", repo: "project", fullName: "demo/project" };
const report = { repository: "demo/project", provider: "gemini", revision: "a".repeat(40), findings: [] };
beforeEach(() => {
  const values = new Map(); vi.stubGlobal("localStorage", { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) });
  mock.auth = { user: null, loading: false }; mock.listeners = []; vi.resetAllMocks(); mock.save.mockResolvedValue(undefined);
  mock.subscribe.mockImplementation((uid, onChange, onError) => { const unsubscribe = vi.fn(); mock.listeners.push({ uid, onChange, onError, unsubscribe }); return unsubscribe; });
});
afterEach(() => { act(() => renderer?.unmount()); vi.unstubAllGlobals(); });

it("persists guest projects/reviews and reconnects without creating duplicate projects", async () => {
  render(); let project;
  await act(async () => { project = await workspace.connect(repository, [{ path: "main.js", size: 12 }]); });
  await act(async () => workspace.saveReview(project.id, report));
  await act(async () => workspace.connect(repository, [{ path: "new.js" }]));
  expect(workspace.projects).toHaveLength(1); expect(workspace.reviews).toHaveLength(1); expect(mock.save).not.toHaveBeenCalled();
  act(() => renderer.unmount()); render();
  expect(workspace.activeProject.id).toBe(project.id); expect(workspace.projects[0].files[0].path).toBe("new.js");
});

it("isolates account snapshots and never puts failed cloud writes in guest storage", async () => {
  mock.auth.user = { uid: "alice" }; render(); const alice = mock.listeners[0];
  act(() => { ["projects", "reviews", "decisions"].forEach((name) => alice.onChange(name, [])); });
  mock.save.mockRejectedValue(new Error("permission-denied"));
  await expect(workspace.connect(repository, [])).rejects.toThrow("permission-denied");
  expect(localStorage.getItem("devmind_security_workspace_v1")).toBeNull();
  mock.auth.user = { uid: "bob" }; act(() => renderer.update(<Probe />));
  expect(workspace.projects).toEqual([]); expect(alice.unsubscribe).toHaveBeenCalledOnce();
  act(() => alice.onChange("projects", [{ id: "private-alice", ...repository }]));
  expect(workspace.projects).toEqual([]);
});

it("requires real matching reviews and notes before saving a disposition", async () => {
  render(); let project, review;
  await act(async () => { project = await workspace.connect(repository, []); });
  await expect(workspace.saveReview(project.id, { ...report, repository: "other/repo" })).rejects.toThrow("does not match");
  const result = { ...report, findings: [{ file_path: "main.js", category: "data_exfiltration", evidence: "send()" }] };
  await act(async () => { review = await workspace.saveReview(project.id, result); });
  const finding = { id: review.findingIds[0] };
  await expect(workspace.saveDecision(review, finding, "resolved", "")).rejects.toThrow("Add a note");
  await act(async () => workspace.saveDecision(review, finding, "resolved", "Verified the destination and removed the call."));
  expect(Object.values(workspace.decisions)[0].note).toContain("Verified");
});

it("retries a failed cloud review write with the same immutable record identity", async () => {
  mock.auth.user = { uid: "alice" }; render();
  const project = { id: "p", ...repository };
  act(() => { mock.listeners[0].onChange("projects", [project]); mock.listeners[0].onChange("reviews", []); mock.listeners[0].onChange("decisions", []); });
  mock.save.mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce(undefined);
  await expect(workspace.saveReview("p", report)).rejects.toThrow("Unavailable");
  await act(async () => workspace.saveReview("p", report));
  expect(mock.save.mock.calls[0][2].id).toBe(mock.save.mock.calls[1][2].id);
  expect(workspace.reviews).toHaveLength(1);
});

it("keeps opened source scoped to its project and bounded to five recent files", async () => {
  render(); let first, second;
  await act(async () => { first = await workspace.connect(repository, []); second = await workspace.connect({ owner: "demo", repo: "second", fullName: "demo/second" }, []); });
  act(() => { for (let index = 0; index < 6; index++) workspace.rememberSource(first.id, `file${index}.js`, `const value = ${index};`); });
  expect(workspace.activeProject.id).toBe(second.id); expect(workspace.sourceFiles).toEqual({});
  act(() => workspace.selectProject(first.id));
  expect(Object.keys(workspace.sourceFiles)).toHaveLength(5); expect(workspace.sourceFiles["file0.js"]).toBeUndefined();
  expect(workspace.sourceFiles["file5.js"]).toBe("const value = 5;");
  act(() => workspace.rememberSource(first.id, "large.js", "x".repeat(20001)));
  expect(workspace.sourceFiles["large.js"]).toBeUndefined();
});
