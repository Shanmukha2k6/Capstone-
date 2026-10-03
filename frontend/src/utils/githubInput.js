const NAME = /^[a-zA-Z0-9_.-]+$/;
const RESERVED = new Set(["topics", "collections", "trending", "search", "orgs", "settings", "login", "features", "marketplace"]);

export function parseGitHubInput(value) {
  let path = value.trim();
  if (!path) throw new Error("Paste a GitHub repository URL, topic URL, or owner/repo.");
  if (/^(https?:\/\/|(?:www\.)?github\.com\/)/i.test(path)) {
    const url = new URL(/^https?:\/\//i.test(path) ? path : `https://${path}`);
    if (!["github.com", "www.github.com"].includes(url.hostname) || url.username || url.password || url.port) {
      throw new Error("Use a URL from github.com.");
    }
    path = url.pathname;
  } else if (path.includes("://")) {
    throw new Error("Use a URL from github.com.");
  }
  const parts = path.replace(/^\/+|\/+$/g, "").split("/");
  if (parts[0] === "topics" && parts.length === 2 && /^[a-z0-9-]{1,50}$/i.test(parts[1])) {
    return { kind: "topic", topic: parts[1].toLowerCase() };
  }
  const [owner, rawRepo] = parts;
  const repo = rawRepo?.replace(/\.git$/i, "");
  if (!owner || !repo || !NAME.test(owner) || !NAME.test(repo) || [".", ".."].includes(repo) || RESERVED.has(owner.toLowerCase())) {
    throw new Error("Enter owner/repo, a GitHub repository URL, or a GitHub topic URL.");
  }
  return { kind: "repo", owner, repo, fullName: `${owner}/${repo}` };
}
