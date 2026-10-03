# DevMind AI - Product Requirements Document (PRD)

## Accepted SaaS direction — repository security reviews

DevMind is a repository security review workspace for developers maintaining small projects. The primary workflow is **connect a repository → run a bounded source review → inspect commit-linked evidence → record a disposition → export the review**. The assistant remains a minimal supporting tool. Generic explanation/refactoring tools are secondary utilities, not the product's central claim.

This increment adds saved repository identities and file inventories, immutable review runs, a latest-review findings inbox, review notes/statuses, coverage-aware comparison with a previous run, and downloadable Markdown reports. Guest records remain on the current device. Configured Firebase accounts use owner-scoped project, review, and decision collections; no automatic migration of guest records into an account. API keys and GitHub tokens are never included in those records. Loaded source context is kept in memory, separately from saved project metadata and reports.

All dashboard numbers must derive from saved records. A failed or unconfigured Gemini call creates no security review. Review comparisons use exact source-evidence fingerprints and only classify missing indicators in files reviewed by both runs; absence is not proof of remediation. Resolved/accepted-risk decisions require a human note and remain user decisions, not verified fixes. Reports retain source revision, provider, coverage, limitations, decisions, and comparison caveats.

Acceptance: reload a connected project without losing its identity/inventory; preserve a successful review across navigation/reload; filter findings and save a decision/note; export revision-linked evidence; verify different review coverage does not label omitted files as fixed; isolate account records; show truthful empty/loading/failure states. Production billing, shared team roles, GitHub webhooks, scheduled scans, CI enforcement, and certified malware detection are outside this increment.

## Reference alignment — 1 October 2026

Reference: [Shared capstone project brief](https://chatgpt.com/share/6abbdfaa-601c-83e8-946e-eec83ee7d8df).

The reference describes a project-centered platform: import a repository or ZIP, inspect its files, collect code insights, show repository analytics, and answer project questions using source context. Its core priorities are GitHub integration, explanation, bug/security analysis, refactoring, documentation, repository analytics, and project-aware chat. ZIP imports, project management, retrieval, and project overviews support that workflow; pull-request review is an optional extension.

Keep **React + FastAPI + Firebase Authentication/Firestore**, honoring the user's earlier Firebase requirement. Suggested alternative databases or product names in the reference do not replace that decision. Use the user's latest requested dark theme, retaining colorful accents. Settings allows temporary browser-session Gemini keys for the AI assistant and repository security scans.

### Implementation audit

| Capability | Current implementation | Work needed for a complete project demo |
| --- | --- | --- |
| GitHub import | Live repository/topic discovery, default-branch file loading, actionable errors | Persist a selected project and retain its source context across pages |
| Project inputs | Paste a snippet or select one GitHub file | Add bounded ZIP import and a project file model |
| Explanation and refactoring | Single-file tools, result cards, before/after views | Use a configured AI provider and associate results with project/file identities |
| Bugs and security | Single-file tools plus a bounded Gemini repository malware-indicator review with revision, file/line evidence, and coverage | Configure a Gemini key and verify a live scan; extend general vulnerability aggregation separately |
| Quality | Per-snippet scorecard | Aggregate completed file analyses and explain scoring/coverage |
| Documentation | Docstring UI and a README API endpoint | Add a project README generation/download flow based on imported source |
| Repository analytics | Backend statistics endpoint | Display fetched stars, forks, issues, and language breakdown; add activity only when fetched |
| Project-aware assistant | Manual context input and SSE chat; saved Gemini keys select real streaming with explicit failure handling | Retrieve relevant project code automatically and validate source citations |
| Persistence | Guest local history; Firebase account/history integration | Add owner-scoped project records and project-linked analysis/chat storage |
| Real AI | Repository malware review and chat use saved Gemini keys and surface failures without fixtures; other local tools use mock mode | Verify live scans; remove legacy fallback behavior from remaining provider tools |

This table records gaps, not completed functionality. Firebase cloud integration remains unverified until a real project is configured. Existing sample responses must not be presented as findings about an imported repository.

The repository malware review is implemented and tested with mocked provider responses. A live Gemini scan remains unverified because no API key is configured. See [Gemini security scan setup](GEMINI_SECURITY_SCAN.md) for limits and configuration; this source review cannot certify a repository as malware-free.

### Implementation order and acceptance evidence

1. **AI correctness and visibility.** Keep demo mode explicit. A configured provider must either return a validated response or an actionable error. Health/UI status must reflect the provider actually used. Verify with distinct inputs and a provider failure.
2. **Projects and source context.** Introduce a selected project containing repository metadata, a source-file manifest, and imported source. Resolve the repository once, keep file identities stable, and carry selection into analysis and chat. Apply file/count/total-size limits and report omitted files.
3. **Project analysis.** Run bounded analysis over selected source files, record individual successes/failures, and aggregate actual results. Show analyzed versus skipped files, rather than implying complete repository coverage. Preserve file paths and source revisions with findings.
4. **Overview, analytics, and documentation.** Replace illustrative project metrics with saved analyses and fetched GitHub metadata. Generate a README from project context and offer a download. Verify every metric against its source.
5. **Project Q&A.** Chunk imported code with file/line metadata, retrieve relevant chunks, and provide them to the AI gateway. Return citations only for indexed source. If initial retrieval is lexical, label it accurately; claim embedding/vector RAG only after implementing and testing it.
6. **Firebase project persistence and ZIP import.** Store user-owned metadata/results with explicit Firestore rules. Avoid storing whole repositories in a single Firestore document. For ZIPs, enforce path, file-count, and expanded-size limits and treat extracted code as data.

Completion demo: import a small public repository, select/analyze multiple source files, inspect findings and coverage, view real analytics, download a generated README, and ask a source-grounded project question. Also verify a missing repository, an upstream error, and a file outside analysis limits. Optional PR review follows the core workflow.

---

## 1. Product Overview
**DevMind AI** is an AI-powered developer productivity platform designed to assist developers, engineers, and technical leads in analyzing code, finding bugs & security vulnerabilities, generating production-grade documentation, scoring codebase quality, and chatting with code repositories.

### Target Personas
1. **Solo Developers / Students**: Need quick code explanations, bug fixes, refactoring suggestions, and README/docstring generation.
2. **Software Engineers**: Reviewing pull requests, identifying OWASP/CWE security risks, and exploring unfamiliar repositories.
3. **Tech Leads & Reviewers**: Scoring repository health, maintainability, and code complexity before merging or onboarding.

### Non-Goals (Scope Boundaries)
- Arbitrary code execution / sandboxing (DevMind treats code as read-only data).
- Full automated CI/CD deployment pipelines in MVP (reserved for future GitHub App extension).
- Replacement for full IDEs (DevMind is a focused analysis & developer intelligence platform).

---

## 2. Core Features & User Stories

### A. Code Explanation & Summarization
- **User Story**: As a developer, I want to paste code or select a file and receive a high-level summary, step-by-step walkthrough, complexity analysis, and pitfalls tailored to my skill level (Beginner, Intermediate, Senior).
- **Inputs**: Code snippet, language, explanation depth level.
- **Outputs**: Purpose summary, execution walkthrough, time/space complexity, potential risks.

### B. Bug & Security Vulnerability Detection
- **User Story**: As a security-conscious developer, I want my code scanned for logic bugs, OWASP Top 10 vulnerabilities, CWE issues, and hardcoded secrets.
- **Outputs**: List of findings with severity (Critical, High, Medium, Low), line numbers, CWE tag, clear rationale, and copyable fixed code.

### C. AI Refactoring & Optimization Suggestions
- **User Story**: As an engineer, I want actionable refactoring suggestions to improve readability, performance, and maintainability without altering functionality.
- **Outputs**: Ranked list of suggestions with before/after diffs, risk assessment, and reasoning.

### D. Automated Documentation Generation
- **User Story**: As an open-source author, I want to automatically generate comprehensive README.md files, Python docstrings, or JavaDoc/JSDoc comments.
- **Outputs**: Markdown README template or documented code preserving existing functionality.

### E. Quality Scorecard & Metrics
- **User Story**: As a team lead, I want an aggregated health score (0-100) across Maintainability, Security, Complexity, and Documentation.
- **Outputs**: Dimension scores, radar/bar visual breakdown, and actionable improvement recommendations.

### F. Codebase & Repo-Aware Chat
- **User Story**: As a developer exploring a new repo, I want to ask questions like "Where is user authentication handled?" and get citations pointing directly to files and lines.
- **Outputs**: Streaming responses citing specific files `[path:line]`.

---

## 3. Architecture & Tech Stack (Simplified & Cloud-Ready)
- **Frontend**: React 18 (Vite), Tailwind CSS, Lucide React, Monaco Editor, React Markdown, Recharts.
- **Authentication**: Firebase Authentication (Email/Password + GitHub OAuth).
- **Database**: Cloud Firestore (NoSQL for user profiles, analysis history, saved repos, and chat transcripts).
- **Backend API**: FastAPI (Python 3.11+) for high-performance async processing, LLM streaming, token budgeting, and GitHub API interactions.
- **AI Gateway**: Google Gemini (`gemini-1.5-flash` / `gemini-1.5-pro` / `gemini-2.0`) & OpenAI (`gpt-4o-mini` / `gpt-4o`) adapters with fallback and retry logic.
