const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const GITHUB_API = "https://api.github.com";
const LOCAL_GEMINI_KEY = "devmind_gemini_key";

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

function getStoredKey() {
  try {
    return sessionStorage.getItem(LOCAL_GEMINI_KEY) || localStorage.getItem(LOCAL_GEMINI_KEY) || "";
  } catch {
    return "";
  }
}

function setStoredKey(key) {
  try {
    if (key) {
      sessionStorage.setItem(LOCAL_GEMINI_KEY, key);
      localStorage.setItem(LOCAL_GEMINI_KEY, key);
    } else {
      sessionStorage.removeItem(LOCAL_GEMINI_KEY);
      localStorage.removeItem(LOCAL_GEMINI_KEY);
    }
  } catch {}
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
  try {
    const res = await fetch(`${BASE_URL}/settings/gemini`, {
      method, credentials: "include", cache: "no-store",
      headers: { "Content-Type": "application/json", "X-DevMind-Settings": "1" },
      ...(apiKey !== undefined ? { body: JSON.stringify({ api_key: apiKey }) } : {}),
    });
    if (res.ok) {
      const data = await res.json();
      if (method === "POST" && apiKey) {
        setStoredKey(apiKey);
      } else if (method === "DELETE") {
        setStoredKey("");
      }
      return data;
    }
    const error = await res.json().catch(() => ({}));
    throw new Error(typeof error.detail === "string" ? error.detail : "Could not update Gemini settings. Try again.");
  } catch (err) {
    if (!isNetworkError(err)) throw err;
    // Backend offline / network error: use browser session storage fallback
    if (method === "POST") {
      const trimmed = (apiKey || "").trim();
      if (trimmed.length < 20) {
        throw new Error("Enter a valid Gemini API key (at least 20 characters).");
      }
      setStoredKey(trimmed);
      return {
        configured: true,
        session_key: true,
        source: "session",
        model: "gemini-1.5-flash",
        expires_in_seconds: 28800
      };
    } else if (method === "DELETE") {
      setStoredKey("");
      return {
        configured: false,
        session_key: false,
        source: "none",
        model: "gemini-1.5-flash",
        expires_in_seconds: null
      };
    } else {
      const localKey = getStoredKey();
      return {
        configured: Boolean(localKey),
        session_key: Boolean(localKey),
        source: localKey ? "session" : "none",
        model: "gemini-1.5-flash",
        expires_in_seconds: localKey ? 28800 : null
      };
    }
  }
}

async function streamDirectGemini(apiKey, repoName, messages, context, onToken, onDone) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`;
  const systemPrompt = `You are DevMind AI, an expert software engineering assistant. You help developers understand, inspect, refactor, and secure their code. Context: ${repoName || "Project"}.${context ? `\n\n${context}` : ""}`;

  const contents = (messages || []).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content || "" }]
  }));

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: contents.length ? contents : [{ role: "user", parts: [{ text: "Hello" }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 4096 }
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      throw new Error("Gemini rejected the API key. Please check your API key in Settings.");
    }
    throw new Error(err.error?.message || `Gemini request failed (HTTP ${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const jsonStr = trimmed.slice(5).trim();
      if (!jsonStr) continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) onToken(text);
      } catch {}
    }
  }
  onDone?.();
}

async function directGeminiJson(apiKey, prompt, systemPrompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json"
      }
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini API error (${res.status})`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  return JSON.parse(text);
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
    try {
      const response = await fetch(`${BASE_URL}/chat/config`, { credentials: "include", cache: "no-store" });
      if (response.ok) return response.json();
    } catch (err) {
      if (!isNetworkError(err)) throw err;
    }
    const localKey = getStoredKey();
    return {
      provider: localKey ? "gemini" : "mock",
      model: localKey ? "gemini-1.5-flash" : "demo",
      gemini_configured: Boolean(localKey)
    };
  },
  getGeminiSettings: () => geminiSettingsRequest(),
  saveGeminiKey: (apiKey) => geminiSettingsRequest("POST", apiKey),
  removeGeminiKey: () => geminiSettingsRequest("DELETE"),
  async checkHealth() {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.ok) return res.json();
    } catch {}
    return { status: "offline", provider: "client-direct" };
  },

  async explainCode(code, language = "python", level = "intermediate") {
    try {
      const res = await fetch(`${BASE_URL}/analyze/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, level })
      });
      if (res.ok) return res.json();
      const err = await res.json().catch(() => ({ detail: "Analysis failed" }));
      throw new Error(err.detail || "Failed to explain code");
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      const key = getStoredKey();
      if (!key) throw new Error("DevMind backend is offline. Enter a Gemini API key in Settings to analyze code.");
      const prompt = `Explain this ${language} code for a ${level} developer:\n\`\`\`${language}\n${code}\n\`\`\`\nReturn JSON with keys: purpose (string), walkthrough (array of strings), key_concepts (array of strings), time_complexity (string), space_complexity (string), pitfalls (array of strings), line_notes (array of {line: number, note: string}).`;
      return directGeminiJson(key, prompt, "You are a code tutor providing clear, accurate analysis in JSON format.");
    }
  },

  async scanBugs(code, language = "python") {
    try {
      const res = await fetch(`${BASE_URL}/analyze/bugs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language })
      });
      if (res.ok) return res.json();
      const err = await res.json().catch(() => ({ detail: "Scan failed" }));
      throw new Error(err.detail || "Failed to scan bugs");
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      const key = getStoredKey();
      if (!key) throw new Error("DevMind backend is offline. Enter a Gemini API key in Settings to scan bugs.");
      const prompt = `Analyze this ${language} code for bugs and security vulnerabilities:\n\`\`\`${language}\n${code}\n\`\`\`\nReturn JSON with keys: summary (string), findings (array of {id: string, title: string, severity: 'critical'|'high'|'medium'|'low'|'info', category: string, cwe: string, line_start: number, line_end: number, explanation: string, fix: string, fixed_code: string, confidence: number}).`;
      return directGeminiJson(key, prompt, "You are an application security specialist analyzing code for vulnerabilities.");
    }
  },

  async suggestRefactor(code, language = "python", focus = "all") {
    try {
      const res = await fetch(`${BASE_URL}/analyze/refactor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, focus })
      });
      if (res.ok) return res.json();
      const err = await res.json().catch(() => ({ detail: "Refactor failed" }));
      throw new Error(err.detail || "Failed to get refactoring suggestions");
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      const key = getStoredKey();
      if (!key) throw new Error("DevMind backend is offline. Enter a Gemini API key in Settings to suggest refactors.");
      const prompt = `Suggest refactoring for this ${language} code focusing on ${focus}:\n\`\`\`${language}\n${code}\n\`\`\`\nReturn JSON with keys: summary (string), suggestions (array of {id: string, title: string, impact: 'high'|'medium'|'low', category: string, rationale: string, before_code: string, after_code: string, risk_level: string}).`;
      return directGeminiJson(key, prompt, "You are a software architect improving code readability, performance, and structure.");
    }
  },

  async analyzeQuality(code, language = "python") {
    try {
      const res = await fetch(`${BASE_URL}/analyze/quality`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language })
      });
      if (res.ok) return res.json();
      const err = await res.json().catch(() => ({ detail: "Quality analysis failed" }));
      throw new Error(err.detail || "Failed to analyze code quality");
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      const key = getStoredKey();
      if (!key) throw new Error("DevMind backend is offline. Enter a Gemini API key in Settings to analyze quality.");
      const prompt = `Analyze quality metrics for this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\`\nReturn JSON with keys: overall_score (number 0-100), dimensions ({maintainability: number, security: number, complexity: number, documentation: number}), metrics ({loc: number, comment_ratio: number, cyclomatic_complexity: number}), recommendations (array of strings).`;
      return directGeminiJson(key, prompt, "You are a code auditor calculating quality scores and recommendations.");
    }
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
      if (response.ok) {
        await readChatStream(response, onToken, onDone);
        return;
      }
      const error = await response.json().catch(() => ({}));
      throw new Error(typeof error.detail === "string" ? error.detail : "Could not connect to the assistant. Please retry.");
    } catch (err) {
      if (!isNetworkError(err)) {
        onError?.(err.message);
        return;
      }
      // Backend offline: direct client-side Gemini streaming
      const localKey = getStoredKey();
      if (!localKey) {
        onError?.("DevMind backend is offline. Enter a Gemini API key in Settings to chat with Gemini directly.");
        return;
      }
      try {
        await streamDirectGemini(localKey, repoName, messages, context, onToken, onDone);
      } catch (geminiErr) {
        onError?.(geminiErr.message);
      }
    }
  }
};
