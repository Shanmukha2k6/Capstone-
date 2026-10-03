const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

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
    return githubRequest(`/topics/${encodeURIComponent(topic)}`, token);
  },

  async getMalwareScanConfig() {
    return githubRequest("/scan-config");
  },

  async scanRepoMalware(owner, repo, maxFiles = 12, token = "") {
    return githubRequest(`/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/malware-scan`, token,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ max_files: maxFiles }) });
  },

  async getRepoTree(owner, repo, branch = null, token = "") {
    const query = branch ? `?branch=${encodeURIComponent(branch)}` : "";
    return githubRequest(`/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tree${query}`, token);
  },

  async getRepoFile(owner, repo, path, token = "") {
    return githubRequest(`/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/file?path=${encodeURIComponent(path)}`, token);
  },

  async getRepoStats(owner, repo, token = "") {
    return githubRequest(`/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/stats`, token);
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
