import React from "react";
import { act, create } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ getChatConfig: vi.fn(), streamChat: vi.fn() }));
vi.mock("../api/client", () => ({ api: mock }));
import ChatAssistant from "./ChatAssistant";

let renderer;
const renderedText = (node) => typeof node === "string" ? node : node.children?.map(renderedText).join("") || "";
afterEach(() => { act(() => renderer?.unmount()); vi.resetAllMocks(); });

it("shows Gemini errors and excludes failed replies from the next conversation", async () => {
  mock.getChatConfig.mockResolvedValue({ provider: "gemini", model: "gemini-model" });
  mock.streamChat.mockImplementationOnce(async (_repo, _messages, _context, onToken, onError) => { onToken("Partial answer"); onError("Gemini quota reached"); })
    .mockImplementationOnce(async (_repo, _messages, _context, onToken, _onError, onDone) => { onToken("Completed answer"); onDone(); });
  await act(async () => { renderer = create(<ChatAssistant onOpenSettings={vi.fn()} />); });
  const send = async (value) => {
    await act(async () => renderer.root.findByProps({ "aria-label": "Message DevMind" }).props.onChange({ target: { value } }));
    await act(async () => renderer.root.findByType("form").props.onSubmit({ preventDefault() {} }));
  };
  await send("Explain my code");
  expect(renderedText(renderer.root.findByProps({ role: "alert" }))).toContain("Gemini quota reached");
  await send("Try again");
  expect(mock.streamChat.mock.calls[1][1]).toEqual([{ role: "user", content: "Explain my code" }, { role: "user", content: "Try again" }]);
  expect(mock.streamChat.mock.calls[1][6]).toBe("gemini");
  expect(renderer.root.findAllByProps({ role: "alert" })).toHaveLength(0);
});

it("lets users write a message, add context, and reset the conversation", async () => {
  mock.getChatConfig.mockResolvedValue({ provider: "mock" });
  mock.streamChat.mockImplementation(async (_repo, _messages, _context, onToken, _onError, onDone) => { onToken("A helpful reply"); onDone(); });
  await act(async () => { renderer = create(<ChatAssistant onOpenSettings={vi.fn()} />); });
  await act(async () => renderer.root.findByProps({ "aria-label": "Message DevMind" }).props.onChange({ target: { value: "Explain the architecture" } }));
  await act(async () => renderer.root.findByProps({ "aria-label": "Attach code context" }).props.onClick());
  await act(async () => renderer.root.findByProps({ "aria-label": "Code context" }).props.onChange({ target: { value: "const value = 1;" } }));
  await act(async () => renderer.root.findByType("form").props.onSubmit({ preventDefault() {} }));
  expect(mock.streamChat.mock.calls[0][2]).toBe("const value = 1;");
  const reset = renderer.root.findAllByType("button").find((button) => renderedText(button).includes("New chat"));
  await act(async () => reset.props.onClick());
  expect(renderer.root.findByProps({ "aria-label": "Message DevMind" }).props.value).toBe("");
  expect(renderer.root.findAllByProps({ "aria-label": "Code context" })).toHaveLength(0);
  expect(renderedText(renderer.root)).not.toContain("A helpful reply");
});

it("keeps Shift+Enter and IME input as text while Enter sends", async () => {
  mock.getChatConfig.mockResolvedValue({ provider: "mock" });
  mock.streamChat.mockImplementation(async (_repo, _messages, _context, onToken, _onError, onDone) => { onToken("Reply"); onDone(); });
  await act(async () => { renderer = create(<ChatAssistant onOpenSettings={vi.fn()} />); });
  await act(async () => renderer.root.findByProps({ "aria-label": "Message DevMind" }).props.onChange({ target: { value: "Explain this" } }));
  const input = renderer.root.findByProps({ "aria-label": "Message DevMind" });
  const preventDefault = vi.fn();
  input.props.onKeyDown({ key: "Enter", shiftKey: true, preventDefault });
  input.props.onKeyDown({ key: "Enter", nativeEvent: { isComposing: true }, preventDefault });
  expect(mock.streamChat).not.toHaveBeenCalled();
  expect(preventDefault).not.toHaveBeenCalled();
  await act(async () => input.props.onKeyDown({ key: "Enter", preventDefault }));
  expect(mock.streamChat).toHaveBeenCalledOnce();
  expect(preventDefault).toHaveBeenCalledOnce();
});

it("sends selected project source and real file-line context to the configured provider", async () => {
  mock.getChatConfig.mockResolvedValue({ provider: "gemini" });
  mock.streamChat.mockImplementation(async (_repo, _messages, _context, _onToken, _onError, onDone) => onDone());
  await act(async () => { renderer = create(<ChatAssistant project={{ id: "p", fullName: "demo/repo" }} sourceFiles={{ "src/auth.js": "export function authenticate() {}" }} />); });
  await act(async () => renderer.root.findByProps({ "aria-label": "Message DevMind" }).props.onChange({ target: { value: "Where is authenticate?" } }));
  await act(async () => renderer.root.findByType("form").props.onSubmit({ preventDefault() {} }));
  expect(mock.streamChat.mock.calls[0][0]).toBe("demo/repo");
  expect(JSON.parse(mock.streamChat.mock.calls[0][2]).chunks[0]).toEqual(expect.objectContaining({ path: "src/auth.js", line_start: 1, line_end: 1 }));
  expect(mock.streamChat.mock.calls[0][6]).toBe("gemini");
});

it("does not return demo answers for a saved repository", async () => {
  mock.getChatConfig.mockResolvedValue({ provider: "mock" });
  await act(async () => { renderer = create(<ChatAssistant project={{ id: "p", fullName: "demo/repo" }} />); });
  await act(async () => renderer.root.findByProps({ "aria-label": "Message DevMind" }).props.onChange({ target: { value: "Inspect this repo" } }));
  await act(async () => renderer.root.findByType("form").props.onSubmit({ preventDefault() {} }));
  expect(mock.streamChat).not.toHaveBeenCalled();
  expect(renderedText(renderer.root.findByProps({ role: "alert" }))).toContain("Connect Gemini");
});
