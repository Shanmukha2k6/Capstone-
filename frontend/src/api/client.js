const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const GITHUB_API = "https://api.github.com";

const IGNORED_PATTERNS = [
  "node_modules", ".git", "venv", ".venv", "__pycache__", "dist", "build",
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", ".DS_Store"
];
const BINARY_EXTENSIONS = [
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".woff", ".woff2",
  ".ttf", ".eot", ".zip", ".tar", ".gz", ".exe", ".dll", ".so", ".dylib", ".pdf"
];

function isTextFile(item) {
  const path = item.path || "";
  const parts = path.split("/");
  if (parts.some((part) => IGNORED_PATTERNS.includes(part))) return false;
  const ext = "." + (path.split(".").pop() || "").toLowerCase();
  if (BINARY_EXTENSIONS.includes(ext)) return false;
  return item.type === "blob";
}

function decodeBase64Utf8(base64) {
  try {
    const binaryString = atob(base64.replace(/\s/g, ""));
    const bytes = Uint8Array.from(binaryString, (m) => m.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return atob(base64.replace(/\s/g, ""));
  }
}

function isNetworkError(err) {
  const msg = (err?.message || "").toLowerCase();
  return (
    err instanceof TypeError ||
    msg.includes("failed to fetch") ||
    msg.includes("fetch failed") ||
    msg.includes("network") ||
    msg.includes("load failed")
  );
}

async function directGitHubRequest(path, token, options = {}) {
  const headers = {
    Accept: "application/vnd.github+json",
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  const res = await fetch(`${GITHUB_API}${path}`, { ...options, headers });
  if (!res.ok) {
    if (res.status === 404) throw new Error("Repository, branch, or file not found. Check the URL; private repositories need an authorized GitHub token.");
    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get("x-ratelimit-remaining");
      if (remaining === "0") throw new Error("GitHub rate limit reached. Add a GitHub token in the explorer to continue.");
      throw new Error("GitHub denied access. Check your token's repository permissions.");
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub error (${res.status})`);
  }
  return res.json();
}

async function githubRequest(path, token, options = {}) {
  const res = await fetch(`${BASE_URL}/repos${path}`, {
    ...options,
    credentials: "include",
    headers: { ...options.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "GitHub request failed. Try again.");
  }
  return res.json();
}

async function geminiSettingsRequest(method = "GET", apiKey) {
  const res = await fetch(`${BASE_URL}/settings/gemini`, {
    method, credentials: "include", cache: "no-store",
    headers: { "Content-Type": "application/json", "X-DevMind-Settings": "1" },
    ...(apiKey !== undefined ? { body: JSON.stringify({ api_key: apiKey }) } : {}),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(typeof error.detail === "string" ? error.detail : "Could not update Gemini settings. Try again.");
  }
  return res.json();
}

async function readChatStream(response, onToken, onDone) {
  if (!response.body) throw new Error("The assistant returned no response stream.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n");
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";
      if (done && buffer.trim()) { events.push(buffer); buffer = ""; }
      for (const event of events) {
        const data = event.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n").trim();
        if (!data) continue;
        if (data === "[DONE]") { onDone?.(); return; }
        let parsed;
        try { parsed = JSON.parse(data); }
        catch { throw new Error("The assistant returned an invalid stream. Please retry."); }
        if (parsed.error) throw new Error(parsed.error);
        if (typeof parsed.token === "string") onToken(parsed.token);
      }
      if (done) throw new Error("The assistant connection ended before the response completed. Please retry.");
    }
  } finally { await reader.cancel().catch(() => {}); }
}

export const api = {
  async getChatConfig() {
    const response = await fetch(`${BASE_URL}/chat/config`, { credentials: "include", cache: "no-store" });
    if (!response.ok) throw new Error("Could not check the assistant connection.");
    return response.json();
  },
  getGeminiSettings: () => geminiSettingsRequest(),
  saveGeminiKey: (apiKey) => geminiSettingsRequest("POST", apiKey),
  removeGeminiKey: () => geminiSettingsRequest("DELETE"),
  async checkHealth() {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error("Backend offline");
    return res.json();
  },

  async explainCode(code, language = "python", level = "intermediate") {
    const res = await fetch(`${BASE_URL}/analyze/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language, level })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Analysis failed" }));
      throw new Error(err.detail || "Failed to explain code");
    }
    return res.json();
  },

  async scanBugs(code, language = "python") {
    const res = await fetch(`${BASE_URL}/analyze/bugs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Scan failed" }));
      throw new Error(err.detail || "Failed to scan bugs");
    }
    return res.json();
  },

  async suggestRefactor(code, language = "python", focus = "all") {
    const res = await fetch(`${BASE_URL}/analyze/refactor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language, focus })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Refactor failed" }));
      throw new Error(err.detail || "Failed to get refactoring suggestions");
    }
    return res.json();
  },

  async analyzeQuality(code, language = "python") {
    const res = await fetch(`${BASE_URL}/analyze/quality`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Quality analysis failed" }));
      throw new Error(err.detail || "Failed to analyze code quality");
    }
    return res.json();
  },

  async generateReadme(projectName, description, techStack, features, codeSamples = []) {
    const res = await fetch(`${BASE_URL}/docs/readme`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_name: projectName,
        description,
        tech_stack: techStack,
        features,
        code_samples: codeSamples
      })
    });
    if (!res.ok) throw new Error("Failed to generate README");
    return res.json();
  },

  async generateDocstrings(code, language = "python", style = "google") {
    const res = await fetch(`${BASE_URL}/docs/docstrings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language, style })
    });
    if (!res.ok) throw new Error("Failed to generate docstrings");
    return res.json();
  },

  async getTopicRepos(topic, token = "") {
    try {
      return await githubRequest(`/topics/${encodeURIComponent(topic)}`, token);
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      const data = await directGitHubRequest(`/search/repositories?q=topic:${encodeURIComponent(topic)}&sort=stars&order=desc&per_page=20`, token);
      return {
        topic,
        total_count: data.total_count || 0,
        incomplete_results: data.incomplete_results || false,
        repositories: (data.items || []).map((repo) => ({
          full_name: repo.full_name,
          description: repo.description,
          default_branch: repo.default_branch,
          language: repo.language,
          stars: repo.stargazers_count || 0,
        })),
      };
    }
  },

  async getMalwareScanConfig() {
    try {
      return await githubRequest("/scan-config");
    } catch (err) {
      if (isNetworkError(err)) {
        return { enabled: true, max_files_limit: 12, default_files: 8 };
      }
      throw err;
    }
  },

  async scanRepoMalware(owner, repo, maxFiles = 12, token = "") {
    try {
      return await githubRequest(`/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/malware-scan`, token,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ max_files: maxFiles }) });
    } catch (err) {
      if (isNetworkError(err)) {
        throw new Error("AI malware scan requires the backend server. Run 'start_dev.bat' or configure VITE_API_URL.");
      }
      throw err;
    }
  },

  async getRepoTree(owner, repo, branch = null, token = "") {
    try {
      const query = branch ? `?branch=${encodeURIComponent(branch)}` : "";
      return await githubRequest(`/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tree${query}`, token);
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      let targetBranch = branch;
      if (!targetBranch) {
        const repoInfo = await directGitHubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, token);
        targetBranch = repoInfo.default_branch;
        if (!targetBranch) throw new Error("This repository has no default branch to analyze.");
      }
      const data = await directGitHubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(targetBranch)}?recursive=1`, token);
      if (data.truncated) throw new Error("This repository's file tree is too large to load completely.");
      return (data.tree || [])
        .filter(isTextFile)
        .map((item) => ({ path: item.path, type: "blob", size: item.size || 0 }));
    }
  },

  async getRepoFile(owner, repo, path, token = "") {
    try {
      return await githubRequest(`/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/file?path=${encodeURIComponent(path)}`, token);
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      const data = await directGitHubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`, token);
      if (!data || data.type !== "file") throw new Error("Select a source file, rather than a directory or submodule.");
      let content = "";
      if (data.encoding === "base64" && data.content) {
        content = decodeBase64Utf8(data.content);
      } else if (data.download_url) {
        const rawRes = await fetch(data.download_url);
        content = await rawRes.text();
      }
      return { path, content };
    }
  },

  async getRepoStats(owner, repo, token = "") {
    try {
      return await githubRequest(`/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/stats`, token);
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      const [repoInfo, languages] = await Promise.all([
        directGitHubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, token),
        directGitHubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`, token).catch(() => ({})),
      ]);
      const total_bytes = Object.values(languages).reduce((a, b) => a + b, 0) || 1;
      return {
        full_name: repoInfo.full_name,
        description: repoInfo.description,
        default_branch: repoInfo.default_branch,
        language: repoInfo.language,
        stars: repoInfo.stargazers_count || 0,
        forks: repoInfo.forks_count || 0,
        open_issues: repoInfo.open_issues_count || 0,
        subscribers: repoInfo.subscribers_count || 0,
        languages: Object.entries(languages).map(([name, size]) => ({
          name,
          bytes: size,
          percentage: Math.round((size / total_bytes) * 1000) / 10,
        })),
      };
    }
  },

  async streamChat(repoName, messages, context, onToken, onError, onDone, expectedProvider) {
    try {
      const response = await fetch(`${BASE_URL}/chat/stream`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...(expectedProvider ? { "X-DevMind-Provider": expectedProvider } : {}) },
        body: JSON.stringify({ repo_name: repoName, messages, context })
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(typeof error.detail === "string" ? error.detail : "Could not connect to the assistant. Please retry.");
      }
      await readChatStream(response, onToken, onDone);
    } catch (err) { onError?.(err.message); }
  }
};
