import { describe, expect, it } from "vitest";
import { parseGitHubInput } from "./githubInput";

describe("GitHub links", () => {
  it.each([" fastapi/fastapi ", "https://github.com/fastapi/fastapi", "https://github.com/fastapi/fastapi.git/", "github.com/fastapi/fastapi", "https://github.com/fastapi/fastapi/blob/master/fastapi/applications.py?plain=1"])("loads the repository from %s", (input) => {
    expect(parseGitHubInput(input)).toEqual({ kind: "repo", owner: "fastapi", repo: "fastapi", fullName: "fastapi/fastapi" });
  });
  it("recognizes the user's topic URL as discovery, rather than a repository", () => {
    expect(parseGitHubInput("https://github.com/topics/open-source-project")).toEqual({ kind: "topic", topic: "open-source-project" });
  });
  it.each(["", "fastapi", "https://example.com/fastapi/fastapi", "https://github.com.evil.test/fastapi/fastapi", "https://user:secret@github.com/fastapi/fastapi", "https://github.com/topics", "https://github.com/search?q=test", "owner/..", "owner/a b"])("rejects non-repository input %s", (input) => {
    expect(() => parseGitHubInput(input)).toThrow();
  });
});
