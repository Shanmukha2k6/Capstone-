# DevMind AI - API Specification

Base URL: `http://localhost:8000/api`

## Health & System
### `GET /health`
- **Response**: `200 OK`
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "provider": "gemini"
}
```

---

## Code Analysis (`/api/analyze`)

### `POST /api/analyze/explain`
Generate multi-level explanations with architectural walkthrough and complexity analysis.
- **Request Body**:
```json
{
  "code": "string (max 20000 chars)",
  "language": "python|javascript|typescript|java|cpp|go|rust|csharp",
  "level": "beginner|intermediate|expert"
}
```
- **Response**: `200 OK` (JSON or SSE stream)
```json
{
  "purpose": "One-sentence executive summary.",
  "walkthrough": ["Step 1...", "Step 2..."],
  "key_concepts": ["Recursion", "Memoization"],
  "time_complexity": "O(N)",
  "space_complexity": "O(N)",
  "pitfalls": ["Stack overflow on large inputs"],
  "line_notes": [{"line": 12, "note": "Base case check"}]
}
```

### `POST /api/analyze/bugs`
Detect logic bugs, security vulnerabilities (OWASP/CWE), and hardcoded secrets.
- **Request Body**:
```json
{
  "code": "string",
  "language": "string"
}
```
- **Response**: `200 OK`
```json
{
  "findings": [
    {
      "id": "bug-1",
      "title": "SQL Injection in User Query",
      "severity": "critical",
      "category": "Security (Injection)",
      "cwe": "CWE-89",
      "line_start": 24,
      "line_end": 26,
      "explanation": "Direct concatenation of user parameter into SQL query string.",
      "fix": "Use parameterized queries or ORM bindings.",
      "fixed_code": "cursor.execute('SELECT * FROM users WHERE id = %s', (user_id,))",
      "confidence": 0.98
    }
  ],
  "summary": "Found 1 critical security flaw."
}
```

### `POST /api/analyze/refactor`
Provide prioritized code refactoring and optimization recommendations.
- **Request Body**:
```json
{
  "code": "string",
  "language": "string",
  "focus": "readability|performance|maintainability|all"
}
```
- **Response**: `200 OK`
```json
{
  "suggestions": [
    {
      "id": "refactor-1",
      "title": "Replace nested loops with Set lookup",
      "impact": "high",
      "category": "performance",
      "rationale": "Reduces lookup complexity from O(N^2) to O(N).",
      "before_code": "for a in list_a:\n  for b in list_b: ...",
      "after_code": "set_b = set(list_b)\nfor a in list_a: ...",
      "risk_level": "low"
    }
  ],
  "summary": "1 high-impact performance refactoring suggested."
}
```

### `POST /api/analyze/quality`
Evaluate code maintainability, security, complexity, and documentation score (0-100).
- **Request Body**:
```json
{
  "code": "string",
  "language": "string"
}
```
- **Response**: `200 OK`
```json
{
  "overall_score": 85,
  "dimensions": {
    "maintainability": 88,
    "security": 92,
    "complexity": 75,
    "documentation": 80
  },
  "metrics": {
    "loc": 142,
    "comment_ratio": 0.18,
    "cyclomatic_complexity": 6
  },
  "recommendations": [
    "Add docstrings to helper methods",
    "Reduce parameter count in function process_data"
  ]
}
```

---

## Documentation (`/api/docs`)

### `POST /api/docs/readme`
Generate a full production README.md for a project or component.
- **Request Body**:
```json
{
  "project_name": "DevMind AI",
  "description": "Short summary",
  "tech_stack": ["React", "FastAPI", "Firebase"],
  "code_samples": ["string"],
  "features": ["Feature 1", "Feature 2"]
}
```
- **Response**:
```json
{
  "readme_markdown": "# DevMind AI\n\n## Overview\n..."
}
```

### `POST /api/docs/docstrings`
Annotate code with idiomatic docstrings/JSDoc/JavaDoc without altering code logic.
- **Request Body**:
```json
{
  "code": "string",
  "language": "string",
  "style": "google|numpy|jsdoc|javadoc"
}
```
- **Response**:
```json
{
  "annotated_code": "def calculate_tax(amount: float) -> float:\n    \"\"\"Calculates tax...\"\"\""
}
```

---

## GitHub Integration (`/api/repos`)
The SaaS workflow retains projects, completed reviews, and human decisions through the frontend Firebase adapter (or guest local storage), without adding another backend LLM endpoint. Owner collections and bounds are documented in [SaaS product scope](SAAS_PRODUCT.md). Projects store metadata and a bounded inventory; raw file context is session-only. Saved review report contents remain immutable and dispositions are separate records.
- `GET /api/repos`: List user repositories. Send credentials as `Authorization: Bearer <token>`; the legacy token query parameter remains supported.
- `GET /api/repos/topics/{topic}`: Discover up to 20 repositories for a GitHub topic, sorted by stars. Returns `{topic, total_count, incomplete_results, repositories: [{full_name, description, default_branch, language, stars}]}`.
- `GET /api/repos/{owner}/{repo}/tree?branch={branch}`: Retrieve actual text files (omitting directories, submodules, binaries, lockfiles, and node_modules). Omit `branch` to resolve the repository's default branch.
- `GET /api/repos/{owner}/{repo}/file?path={path}`: Fetch individual file content for workspace inspection.
- `GET /api/repos/{owner}/{repo}/stats`: Fetch repository language and activity statistics.

GitHub failures return an actionable `detail` with HTTP 401 (invalid token), 403 (permissions), 404 (not found), 409 (empty repository), 429 (rate limited), or 502 (upstream/network failure). Unsupported files and truncated trees return 422.

The repository explorer accepts `owner/repo`, GitHub repository URLs, and topic URLs. Topic URLs show a repository picker. Select a supported source file, open it in the code workspace, then run analysis; the sample limits each analysis to 20,000 characters. Mock mode loads real GitHub files but returns illustrative analysis results.

### Gemini malware-indicator review

- `GET /api/repos/scan-config`: Returns `{provider: "gemini", configured: boolean, model: string, session_key: boolean, source: "session" | "server" | "none", expires_in_seconds: number | null}` for the current browser session. Never returns the API key; responses use `Cache-Control: no-store`.
- `POST /api/repos/{owner}/{repo}/malware-scan`: Body `{max_files: 12}` (range 1–30). Optional GitHub token in the Authorization header. Uses the browser's backend session key, falling back to server configuration when absent, independently of the general sample-mode provider.
- Resolves the default branch to a commit SHA, loads all reviewed files at that revision, and submits a bounded JSON source manifest to Gemini. Install hooks, scripts, workflow files, and configuration are prioritized. Limits: 20,000 characters per file, 100,000 total, 180-second total deadline.
- Returns `repository`, `revision`, `branch`, `provider`, `model`, `verdict`, `summary`, `findings`, `analyzed_files`, `eligible_files`, `available_text_files`, `skipped_count`, `skipped_files`, `unverified_findings`, and `limitations`.
- A finding contains `file_path`, 1-based inclusive `line_start`/`line_end`, `title`, `severity`, `category`, an exact `evidence` snippet, `explanation`, `recommendation`, and model-estimated `confidence`. The server excludes findings that fail source-reference verification.
- Verdicts: `suspicious` means potential indicators needing review; `no_indicators_in_scanned_files` applies only to reviewed files; `inconclusive` means returned evidence could not be verified. None certifies a repository safe or malware-free.
- Missing Gemini key: 503. Provider/quota failures: 502/429. Timeout: 504. No eligible source within limits: 422. No demo fallback. Up to 100 skipped filenames are returned along with the complete skipped count.

This is static AI-assisted review. It does not execute code, inspect binary payloads, download dependencies, or provide an antivirus verdict. `available_text_files` counts the existing GitHub loader's filtered text inventory; binaries and ignored directories are excluded before eligibility selection.

### Browser Gemini settings

- `GET /api/settings/gemini`: Returns the same non-secret status fields as scan configuration, without `provider`.
- `POST /api/settings/gemini`: Body `{api_key: string}`. Saves or replaces a temporary browser credential; returns status only and sets an opaque HttpOnly, SameSite=Strict cookie scoped to `/api`. Key length is 20–256 ASCII characters, without whitespace. Input errors never echo the supplied key.
- `DELETE /api/settings/gemini`: Revokes the session credential and deletes the cookie. A configured server key remains available.
- Both mutations require `X-DevMind-Settings: 1`; a supplied Origin must belong to `ALLOWED_ORIGINS`. Credentials must be included in browser requests. CORS permits configured origins only.
- Keys expire after eight hours or a backend restart and remain in backend memory only. Session credentials override server configuration for repository scans and AI assistant chat without altering global settings. Saving validates input shape; Gemini validates access and quota during use.

---

## Repository Chat (`/api/chat`)
- `GET /api/chat/config`: Non-secret effective provider, model, and key-configuration status for the current browser. Responses use `Cache-Control: no-store`.
- `POST /api/chat/stream`: Stream SSE chat tokens with cited references `[path:line]` when supported by supplied context. Browser requests include credentials to carry the opaque Settings session cookie. A session Gemini key takes precedence over the server Gemini key and general provider; removing it restores server/general configuration.
- Gemini chat uses `streamGenerateContent` with the API key only in `x-goog-api-key`. Repository context is treated as untrusted data. Private thought parts are excluded. Completed replies end with `data: [DONE]`; provider, quota, blocked, malformed, timeout, or interrupted-response failures emit `data: {"error": "..."}` without substituting sample text. Total streaming deadline: 180 seconds.
- The UI sends `X-DevMind-Provider: gemini` when it expects a Gemini reply. If the session/server key is no longer available, the server returns HTTP 409 with a Settings instruction instead of selecting a sample provider.
