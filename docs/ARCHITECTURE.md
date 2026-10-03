# DevMind AI - System Architecture

```
                      +------------------------------------------+
                      |         React Frontend (Vite)            |
                      |   - Tailwind CSS & Lucide Icons          |
                      |   - Monaco Editor & Diff Viewer          |
                      |   - Firebase Client SDK (Auth & Data)    |
                      +-------------------+----------------------+
                                          |
                        +-----------------+-----------------+
                        |                                   |
                (Auth & Firestore)                 (REST / SSE Stream)
                        v                                   v
             +--------------------+               +-------------------+
             |  Firebase Cloud    |               |  FastAPI Backend  |
             |  - Firebase Auth   |               |  - Port 8000      |
             |  - Cloud Firestore |               |  - Async httpx    |
             |    (Analyses,      |               |  - Pydantic v2    |
             |     Chats, Repos)  |               +---------+---------+
             +--------------------+                         |
                                                            |
                                           +----------------+----------------+
                                           |                                 |
                                           v                                 v
                                 +-------------------+             +--------------------+
                                 |    LLM Gateway    |             |   GitHub REST API  |
                                 |  - Gemini Adapter |             |   - Repos / Trees  |
                                 |  - OpenAI Adapter |             |   - Stats & Chunks |
                                 |  - Token Counter  |             +--------------------+
                                 +-------------------+
```

## Architectural Highlights

### 1. Decoupled Authentication & Storage (Firebase)
- **Firebase Auth**: Zero-boilerplate auth with Email/Password and native GitHub OAuth. Eliminates token refresh race conditions and password hashing vulnerabilities.
- **Cloud Firestore**: Serverless, zero-maintenance NoSQL database. Stores saved analyses, user preferences, repositories, and chat conversations. Can be accessed securely directly via Firebase Security Rules or via backend verification.

### 2. Dedicated AI & Analysis Engine (FastAPI)
- **Stateless & Scalable**: FastAPI focuses exclusively on heavy tasks:
  - Dynamic prompt compilation (`backend/app/prompts/*.yaml`).
  - Structured JSON response parsing and Pydantic validation.
  - Streaming Server-Sent Events (SSE) for real-time explanations and chat.
  - GitHub REST API communication with intelligent file filtering.
- **LLM Gateway Pattern**:
  - Abstract base provider (`LLMProvider`) defining `generate()`, `stream()`, and `count_tokens()`.
  - Concrete adapters for `GeminiProvider` and `OpenAIProvider`.
  - Configurable via `LLM_PROVIDER=gemini` or `LLM_PROVIDER=openai` in `.env`.

### 3. File & Directory Layout
```
PP Project/
|-- CLAUDE.md / .cursorrules
|-- docs/
|   |-- PRD.md
|   |-- ARCHITECTURE.md
|   |-- API_SPEC.md
|   |-- PROMPTS.md
|-- backend/
|   |-- app/
|   |   |-- main.py
|   |   |-- core/ (config, security)
|   |   |-- models/ (Pydantic request/response schemas)
|   |   |-- routers/ (analyze, docs, chat, repos, health)
|   |   |-- services/ (llm_gateway, github_service, analyzer)
|   |   |-- prompts/ (YAML templates)
|   |   |-- tests/
|   |-- requirements.txt
|   |-- .env.example
|-- frontend/
|   |-- src/
|   |   |-- api/ (FastAPI client)
|   |   |-- firebase/ (auth & firestore config)
|   |   |-- components/ (Editor, Navbar, Sidebar, FindingCard, DiffView)
|   |   |-- pages/ (Dashboard, CodeWorkspace, RepoExplorer, QualityReport, History)
|   |   |-- context/ (AuthContext)
|   |-- package.json
|   |-- tailwind.config.js
|   |-- .env.example
```
