import React from "react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { create, act } from "react-test-renderer";

vi.mock("../firebase/config", () => ({ auth: null, googleProvider: null, isFirebaseConfigured: false }));
import { AuthProvider, useAuth } from "./AuthContext";

let state, renderer, values;
function Probe() { state = useAuth(); return null; }
const render = () => act(() => { renderer = create(<AuthProvider><Probe /></AuthProvider>); });

beforeEach(() => {
  values = new Map([["devmind_guest_session", "1"], ["devmind_gh_token", "old"]]);
  vi.stubGlobal("localStorage", { getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) });
});
afterEach(() => { act(() => renderer?.unmount()); vi.unstubAllGlobals(); });

describe("AuthProvider without Firebase", () => {
  it("starts signed out and clears legacy guest/token storage", () => {
    render();
    expect(state.user).toBeNull();
    expect(state.loading).toBe(false);
    expect(values.size).toBe(0);
  });
  it("rejects Google sign-in with a clear message", async () => {
    render();
    await expect(state.loginWithGoogle()).rejects.toThrow(/not configured/);
  });
  it("exposes only Google sign-in", () => {
    render();
    expect(state.loginWithEmail).toBeUndefined();
    expect(state.loginAsGuest).toBeUndefined();
  });
});
