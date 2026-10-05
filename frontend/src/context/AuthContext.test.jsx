import React from "react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { create, act } from "react-test-renderer";

vi.mock("../firebase/config", () => ({ auth: null, githubProvider: null, isFirebaseConfigured: false }));
import { AuthProvider, useAuth } from "./AuthContext";

let state, renderer, values;
function Probe() { state = useAuth(); return null; }
const render = () => act(() => { renderer = create(<AuthProvider><Probe /></AuthProvider>); });

beforeEach(() => {
  values = new Map();
  vi.stubGlobal("localStorage", { getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) });
});
afterEach(() => { act(() => renderer?.unmount()); vi.unstubAllGlobals(); });

describe("AuthProvider without Firebase", () => {
  it("persists a guest session across reloads and clears it on logout", async () => {
    render();
    expect(state.user).toBeNull();
    await act(() => state.loginAsGuest());
    expect(state.user).toMatchObject({ uid: "local-guest", isGuest: true });
    act(() => renderer.unmount());
    render();
    expect(state.user?.isGuest).toBe(true);
    await act(() => state.logout());
    expect(state.user).toBeNull();
    expect(values.size).toBe(0);
  });
  it("rejects email sign-in with a clear message", () => {
    render();
    expect(() => state.loginWithEmail("a@b.co", "secret1")).toThrow(/not configured/);
  });
});
