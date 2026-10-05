import React from "react";
import { act, create } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ user: null }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => auth }));
import LandingPage from "./LandingPage";
import { isAppHash, routeFromHash } from "../hooks/useHashRoute";

let renderer;
const text = (node) => typeof node === "string" ? node : node.children?.map(text).join("") || "";
const button = (name) => renderer.root.findAllByType("button").find((node) => text(node).trim() === name);
afterEach(() => { act(() => renderer?.unmount()); auth.user = null; });
const render = (props) => act(() => { renderer = create(<LandingPage onOpenApp={vi.fn()} onSignIn={vi.fn()} {...props} />); });

describe("Landing page", () => {
  it("offers sign-in and get-started actions to signed-out visitors", () => {
    const onOpenApp = vi.fn(), onSignIn = vi.fn();
    render({ onOpenApp, onSignIn });
    act(() => button("Sign in").props.onClick());
    act(() => button("Get started").props.onClick());
    expect(onSignIn).toHaveBeenCalledOnce();
    expect(onOpenApp).toHaveBeenCalledOnce();
  });
  it("shows a dashboard shortcut instead of sign-in for signed-in users", () => {
    auth.user = { uid: "u1" };
    render();
    expect(button("Sign in")).toBeUndefined();
    expect(button("Open dashboard")).toBeDefined();
  });
});

describe("hash routing", () => {
  it("treats only #/app paths as the workspace", () => {
    expect(isAppHash("#/app")).toBe(true);
    expect(isAppHash("#/app/projects")).toBe(true);
    expect(isAppHash("")).toBe(false);
    expect(isAppHash("#faq")).toBe(false);
    expect(isAppHash("#/apple")).toBe(false);
  });
  it("maps hashes to the home, login, and app routes", () => {
    expect(routeFromHash("#/login")).toBe("login");
    expect(routeFromHash("#/app")).toBe("app");
    expect(routeFromHash("#features")).toBe("home");
    expect(routeFromHash("#/loginx")).toBe("home");
  });
});
