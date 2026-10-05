import React from "react";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({}));
vi.mock("./context/AuthContext", () => ({ AuthProvider: ({ children }) => children, useAuth: () => auth }));
vi.mock("./pages/SignInPage", () => ({ default: () => <p>sign-in page</p> }));
vi.mock("./pages/LandingPage", () => ({ default: () => <p>landing page</p> }));
vi.mock("./components/Navbar", () => ({ default: () => null }));
vi.mock("./components/Sidebar", () => ({ default: () => null }));
vi.mock("./components/WorkspaceContent", () => ({ default: () => <p>workspace</p> }));
vi.mock("./hooks/useAnalysisHistory", () => ({ useAnalysisHistory: () => ({ history: [] }) }));
vi.mock("./hooks/useSecurityWorkspace", () => ({ useSecurityWorkspace: () => ({ projects: [] }) }));
import App from "./App";

let renderer;
const text = () => JSON.stringify(renderer.toJSON());
const render = (hash) => { window.location.hash = hash; return act(async () => { renderer = create(<App />); }); };
beforeEach(() => {
  Object.assign(auth, { user: null, loading: false, authError: null });
  vi.stubGlobal("window", { location: { hash: "" }, innerWidth: 1280, addEventListener() {}, removeEventListener() {}, scrollTo() {} });
});
afterEach(() => { act(() => renderer?.unmount()); vi.unstubAllGlobals(); });

describe("App routing", () => {
  it("sends signed-out visitors from the workspace to Google sign-in", async () => {
    await render("#/app");
    expect(window.location.hash).toMatch(/^#?\/login$/);
    expect(text()).toContain("sign-in page");
  });
  it("waits for the auth check before redirecting", async () => {
    auth.loading = true;
    await render("#/app");
    expect(window.location.hash).toBe("#/app");
    expect(text()).toContain("Checking your session");
  });
  it("opens the workspace for signed-in users", async () => {
    auth.user = { uid: "u1" };
    await render("#/app");
    expect(text()).toContain("workspace");
  });
});
