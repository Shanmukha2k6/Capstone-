import { expect, it } from "vitest";
import { projectContext } from "./projectContext";

it("selects relevant opened source with real line numbers and bounded context", () => {
  const source = Array.from({ length: 200 }, (_, index) => index === 140 ? "function authenticate(token) { return verify(token); }" : `// source line ${index + 1}`).join("\n");
  const context = JSON.parse(projectContext({ fullName: "demo/repo" }, { "auth.js": source, "other.js": "const value = 1;" }, "Where is authenticate handled?", "My note"));
  expect(context.chunks[0].path).toBe("auth.js"); expect(context.chunks[0].source).toContain("141: function authenticate");
  expect(context.manual_context).toBe("My note"); expect(context.selection).toContain("not full repository");
  expect(JSON.stringify(context).length).toBeLessThanOrEqual(12007);
});

it("does not invent source when no project files have been opened", () => {
  expect(JSON.parse(projectContext({ fullName: "demo/repo" }, {}, "Find authentication")).chunks).toEqual([]);
  expect(projectContext(null, {}, "Question", "Manual only")).toBe("Manual only");
});
