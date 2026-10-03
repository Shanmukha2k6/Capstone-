import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./client";

const encode = new TextEncoder();
function streamResponse(chunks) {
  return new Response(new ReadableStream({ start(controller) {
    chunks.forEach((chunk) => controller.enqueue(encode.encode(chunk)));
    controller.close();
  } }), { status: 200 });
}
afterEach(() => vi.unstubAllGlobals());

describe("assistant session and streaming", () => {
  it("includes the Settings cookie and parses split SSE events", async () => {
    const fetch = vi.fn().mockResolvedValue(streamResponse(['data: {"tok', 'en":"Live answer"}\r\n\r', '\ndata: [DONE]\r\n\r\n']));
    vi.stubGlobal("fetch", fetch);
    const token = vi.fn(), error = vi.fn(), done = vi.fn();
    await api.streamChat("demo", [{ role: "user", content: "hello" }], "", token, error, done);
    expect(fetch.mock.calls[0][1].credentials).toBe("include");
    expect(token).toHaveBeenCalledWith("Live answer");
    expect(done).toHaveBeenCalledOnce(); expect(error).not.toHaveBeenCalled();
  });
  it("surfaces provider failures without claiming completion", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse(['data: {"error":"Gemini quota reached"}\n\n'])));
    const token = vi.fn(), error = vi.fn(), done = vi.fn();
    await api.streamChat("demo", [], "", token, error, done);
    expect(error).toHaveBeenCalledWith("Gemini quota reached");
    expect(token).not.toHaveBeenCalled(); expect(done).not.toHaveBeenCalled();
  });
  it("reports interrupted streams instead of silently succeeding", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse(['data: {"token":"Partial"}\n\n'])));
    const error = vi.fn(), done = vi.fn();
    await api.streamChat("demo", [], "", vi.fn(), error, done);
    expect(error.mock.calls[0][0]).toContain("before the response completed");
    expect(done).not.toHaveBeenCalled();
  });
  it("preserves actionable HTTP errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "Gemini key required" }), { status: 503 })));
    const error = vi.fn();
    await api.streamChat("demo", [], "", vi.fn(), error, vi.fn());
    expect(error).toHaveBeenCalledWith("Gemini key required");
  });
});
