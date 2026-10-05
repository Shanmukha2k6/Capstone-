import React from "react";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({}));
vi.mock("../context/AuthContext", () => ({ useAuth: () => auth }));
import SignInPage from "./SignInPage";

let renderer;
const text = (node) => typeof node === "string" ? node : node.children?.map(text).join("") || "";
const button = (name) => renderer.root.findAllByType("button").find((node) => text(node).trim() === name);
const props = { onBack: vi.fn(), onSignedIn: vi.fn() };
beforeEach(() => {
  vi.resetAllMocks();
  Object.assign(auth, { user: null, authError: null, isFirebaseConfigured: true, loginWithGoogle: vi.fn(), clearAuthError: vi.fn() });
});
afterEach(() => act(() => renderer?.unmount()));
const render = () => act(async () => { renderer = create(<SignInPage {...props} />); });

describe("Sign-in page", () => {
  it("signs in with Google only and offers back navigation", async () => {
    await render();
    await act(async () => button("Continue with Google").props.onClick());
    expect(auth.loginWithGoogle).toHaveBeenCalledOnce();
    expect(button("Continue without an account")).toBeUndefined();
    act(() => button("Back to home").props.onClick());
    expect(props.onBack).toHaveBeenCalledOnce();
  });
  it("redirects users who are already signed in", async () => {
    auth.user = { uid: "u1" };
    await render();
    expect(props.onSignedIn).toHaveBeenCalled();
  });
  it("shows a friendly error when Google sign-in fails", async () => {
    auth.loginWithGoogle.mockRejectedValue({ code: "auth/network-request-failed" });
    await render();
    await act(async () => button("Continue with Google").props.onClick());
    expect(renderer.root.findAll((node) => node.props.role === "alert")).toHaveLength(1);
  });
  it("disables Google sign-in when Firebase is not configured", async () => {
    auth.isFirebaseConfigured = false;
    await render();
    expect(button("Continue with Google").props.disabled).toBe(true);
    expect(text(renderer.root)).toContain("isn't configured");
  });
});
