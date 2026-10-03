import React from "react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { create, act } from "react-test-renderer";

const mock = vi.hoisted(() => ({
  auth: { user: null, loading: false }, listeners: [],
  save: vi.fn(), clear: vi.fn(), subscribe: vi.fn(),
}));
vi.mock("../context/AuthContext", () => ({ useAuth: () => mock.auth }));
vi.mock("../firebase/history", () => ({
  saveAnalysis: mock.save, clearAnalyses: mock.clear, subscribeToHistory: mock.subscribe,
}));
import { useAnalysisHistory } from "./useAnalysisHistory";

let state, renderer;
function Probe() { state = useAnalysisHistory(); return null; }
const render = () => act(() => { renderer = create(<Probe />); });
const refresh = () => act(() => renderer.update(<Probe />));
const sample = { type: "bugs", title: "Test", timestamp: "2026-10-01T00:00:00.000Z",
  language: "javascript", code: "x".repeat(400), codeSnippet: "x".repeat(100), data: { findings: [] } };

beforeEach(() => {
  const values = new Map();
  vi.stubGlobal("localStorage", { getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) });
  mock.auth = { user: null, loading: false };
  mock.listeners = [];
  mock.save.mockReset().mockResolvedValue(undefined);
  mock.clear.mockReset().mockResolvedValue(undefined);
  mock.subscribe.mockReset().mockImplementation((uid, onChange, onError) => {
    const unsubscribe = vi.fn();
    mock.listeners.push({ uid, onChange, onError, unsubscribe });
    return unsubscribe;
  });
});
afterEach(() => { act(() => renderer?.unmount()); vi.unstubAllGlobals(); });

describe("analysis history", () => {
  it("keeps full source/language and reloads guest history without calling Firebase", async () => {
    render();
    await act(async () => state.save(sample));
    expect(state.history[0].code).toHaveLength(400);
    expect(state.history[0].language).toBe("javascript");
    expect(state.history[0].id).toBeTruthy();
    expect(mock.save).not.toHaveBeenCalled();
    act(() => renderer.unmount());
    render();
    expect(state.history).toHaveLength(1);
  });
  it("keeps guest storage separate and saves signed-in analyses under their uid", async () => {
    localStorage.setItem("devmind_guest_history", JSON.stringify([{ id: "guest-only" }]));
    mock.auth.user = { uid: "alice" };
    render();
    expect(state.history).toEqual([]);
    await act(async () => state.save(sample));
    expect(mock.save).toHaveBeenCalledWith("alice", expect.objectContaining({ code: sample.code, language: "javascript" }));
    expect(JSON.parse(localStorage.getItem("devmind_guest_history"))).toEqual([{ id: "guest-only" }]);
  });
  it("clears previous account data and ignores delayed snapshots when switching users", () => {
    mock.auth.user = { uid: "alice" };
    render();
    const alice = mock.listeners[0];
    act(() => alice.onChange([{ id: "alice-private" }]));
    expect(state.history[0].id).toBe("alice-private");
    mock.auth.user = { uid: "bob" };
    refresh();
    expect(state.history).toEqual([]);
    expect(alice.unsubscribe).toHaveBeenCalledOnce();
    act(() => alice.onChange([{ id: "stale-alice" }]));
    expect(state.history).toEqual([]);
    act(() => mock.listeners[1].onChange([{ id: "bob-private" }]));
    expect(state.history[0].id).toBe("bob-private");
    mock.auth.user = null;
    refresh();
    expect(state.history).toEqual([]);
  });
  it("surfaces failed cloud saves without putting private analyses in guest storage", async () => {
    mock.auth.user = { uid: "alice" };
    mock.save.mockRejectedValue(new Error("permission-denied"));
    render();
    await expect(state.save(sample)).rejects.toThrow("permission-denied");
    expect(localStorage.getItem("devmind_guest_history")).toBeNull();
  });
  it("shows listener failures and delete failures", async () => {
    mock.auth.user = { uid: "alice" };
    render();
    act(() => mock.listeners[0].onError(new Error("unavailable")));
    expect(state.error).toContain("Could not load");
    expect(state.pending).toBe(false);
    mock.clear.mockRejectedValue(new Error("permission-denied"));
    await act(async () => state.clear());
    expect(state.error).toContain("Could not clear");
    expect(mock.clear).toHaveBeenCalledWith("alice");
  });
  it("waits for auth and recovers from corrupt guest storage", async () => {
    mock.auth.loading = true;
    render();
    await expect(state.save(sample)).rejects.toThrow("Wait for sign-in");
    mock.auth.loading = false;
    localStorage.setItem("devmind_guest_history", "invalid JSON");
    refresh();
    expect(state.history).toEqual([]);
    await act(async () => state.save(sample));
    await act(async () => state.clear());
    expect(state.history).toEqual([]);
    expect(localStorage.getItem("devmind_guest_history")).toBeNull();
  });
});
