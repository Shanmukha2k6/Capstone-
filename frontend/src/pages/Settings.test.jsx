import React from "react";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ getGeminiSettings: vi.fn(), saveGeminiKey: vi.fn(), removeGeminiKey: vi.fn() }));
vi.mock("../api/client", () => ({ api: mock }));
import Settings from "./Settings";

let renderer;
const text = (node) => typeof node === "string" ? node : node.children?.map(text).join("") || "";
const input = () => renderer.root.findByType("input");
const button = (name) => renderer.root.findAllByType("button").find((node) => text(node) === name);
const status = { configured: false, session_key: false, source: "none", model: "gemini-model" };
beforeEach(() => { vi.resetAllMocks(); mock.getGeminiSettings.mockResolvedValue(status); });
afterEach(() => act(() => renderer?.unmount()));
const render = () => act(async () => { renderer = create(<Settings onOpenRepositories={vi.fn()} />); });
const typeKey = () => act(async () => input().props.onChange({ target: { value: "test-session-key-1234567890" } }));
const submit = () => act(async () => renderer.root.findByType("form").props.onSubmit({ preventDefault() {} }));

describe("Gemini settings", () => {
  it("masks the key and clears it after saving without returning secrets", async () => {
    mock.saveGeminiKey.mockResolvedValue({ ...status, configured: true, session_key: true, source: "session" });
    await render(); expect(input().props.type).toBe("password");
    expect(button("Save key").props.disabled).toBe(true);
    await typeKey(); await submit();
    expect(mock.saveGeminiKey).toHaveBeenCalledWith("test-session-key-1234567890");
    expect(input().props.value).toBe("");
    expect(text(renderer.root)).toContain("Gemini will validate it when you send a message or run a scan");
    expect(button("Replace key")).toBeDefined();
  });
  it("can remove an active key", async () => {
    mock.getGeminiSettings.mockResolvedValue({ ...status, configured: true, session_key: true, source: "session" });
    mock.removeGeminiKey.mockResolvedValue(status);
    await render(); await act(async () => button("Remove session key").props.onClick());
    expect(mock.removeGeminiKey).toHaveBeenCalledOnce();
    expect(text(renderer.root)).toContain("Session key removed.");
    expect(button("Remove session key")).toBeUndefined();
  });
  it("shows save failures without claiming a key was saved", async () => {
    mock.saveGeminiKey.mockRejectedValue(new Error("Backend unavailable"));
    await render(); await typeKey(); await submit();
    expect(text(renderer.root.findByProps({ role: "alert" }))).toContain("Backend unavailable");
    expect(text(renderer.root)).not.toContain("Session key saved.");
  });
});
