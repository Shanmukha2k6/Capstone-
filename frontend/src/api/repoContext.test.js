import { afterEach, describe, expect, it, vi } from "vitest";
import { buildRepoContext, linkedRepos, pickKeyFiles } from "./repoContext";

const user = (content) => [{ role: "user", content }];

afterEach(() => vi.unstubAllGlobals());

describe("repoContext", () => {
  it("detects GitHub links in the latest message and falls back to an empty selected project", () => {
    expect(linkedRepos("Codebase", user("https://github.com/Shanmukha2k6/VPN\n\nexplain this to me"), "")).toEqual([["Shanmukha2k6", "VPN"]]);
    expect(linkedRepos("nanii08/VotingSystem", user("explain"), "")).toEqual([["nanii08", "VotingSystem"]]);
    expect(linkedRepos("nanii08/VotingSystem", user("explain"), "main.py ...")).toEqual([]);
  });

  it("prefers README, manifests and entry files", () => {
    const tree = ["lib/x.py", "a.png", "client.py", "README.md", "package.json"].map((path) => ({ path, size: 5 }));
    expect(pickKeyFiles(tree)).toEqual(["README.md", "package.json", "client.py", "lib/x.py"]);
  });

  it("fetches repository files into delimited context", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      if (url.endsWith("/repos/Shanmukha2k6/VPN")) return Response.json({ full_name: "Shanmukha2k6/VPN", name: "VPN", owner: { login: "Shanmukha2k6" }, default_branch: "main" });
      if (url.includes("/git/trees/")) return Response.json({ tree: [{ path: "server.py", type: "blob", size: 12 }] });
      return new Response("print('vpn')");
    }));
    const context = await buildRepoContext("Codebase", user("github.com/Shanmukha2k6/VPN"), "");
    expect(context).toContain("<github_repositories>");
    expect(context).toContain("print('vpn')");
  });
});
