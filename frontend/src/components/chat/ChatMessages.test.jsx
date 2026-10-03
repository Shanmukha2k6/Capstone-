import React from "react";
import { act, create } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import ChatMessages from "./ChatMessages";

let renderer;
afterEach(() => { act(() => renderer?.unmount()); vi.unstubAllGlobals(); });

it("renders fenced code and copies the original code without Markdown markers", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  await act(async () => { renderer = create(<ChatMessages messages={[{ role: "assistant", content: "## Explanation\n\n```javascript\nconst count = 2;\n```" }]} streaming={false} />); });
  expect(renderer.root.findByType("h2").children).toEqual(["Explanation"]);
  expect(renderer.root.findByType("code").children).toEqual(["const count = 2;\n"]);
  await act(async () => renderer.root.findByProps({ "aria-label": "Copy code" }).props.onClick());
  expect(writeText).toHaveBeenCalledWith("const count = 2;\n");
  expect(renderer.root.findByProps({ "aria-label": "Copy code" }).children).toContain("Copied");
});

it("does not render HTML supplied in an assistant response", async () => {
  await act(async () => { renderer = create(<ChatMessages messages={[{ role: "assistant", content: '<script>alert("unsafe")</script>\n\n<img src="x" onerror="alert(1)" />\n\nA normal explanation.' }]} streaming={false} />); });
  expect(renderer.root.findAllByType("script")).toHaveLength(0);
  expect(renderer.root.findAllByType("img")).toHaveLength(0);
  expect(renderer.root.findByType("p").children).toEqual(["A normal explanation."]);
});
