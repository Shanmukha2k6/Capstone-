# DevMind AI Development Rules & Vibe Coding Guidelines

You are helping build **DevMind AI**: an AI-Powered Developer Productivity Platform.
Stack: **React (Vite + Tailwind CSS)** + **Firebase (Auth & Firestore)** frontend, with a **FastAPI** backend for the LLM Gateway and code analysis.

## Core Rules & Architecture Standards
- **Python**: Python 3.11+, type hints everywhere, Pydantic v2, async endpoints.
- **Backend Architecture**:
  - Routers stay thin (`backend/app/routers/`); all business logic resides in `backend/app/services/`.
  - Configuration: Never hardcode secrets; read from `app.core.config.Settings` via `pydantic-settings`.
  - LLM Gateway: All LLM calls go through `backend/app/services/llm_gateway.py` only (supporting Google Gemini and OpenAI).
  - Prompts: Versioned prompt templates live in `backend/app/prompts/` (YAML/Markdown), never inline in routers.
  - Streaming: Use Server-Sent Events (SSE) for chat and real-time LLM explanations.
- **Frontend Architecture**:
  - React (Vite) + Tailwind CSS + Lucide Icons + Monaco Editor.
  - Functional components with hooks, clean component separation, no inline styles.
  - Firebase SDK for client-side Auth (Email/Password & 1-click GitHub OAuth) and Firestore (history, saved analyses, chat sessions).
  - Responsive layout, dark mode support, clear loading skeletons, error boundaries, and empty states.
- **Security & Quality**:
  - Never execute user code directly; treat all submitted code as data, strictly delimited by `<language>` and `<code>` tags.
  - Input character limits (e.g. 20,000 characters) and structured Pydantic schema validation.
  - Maintain test coverage with `pytest` for backend endpoints. Keep functions under 40 lines.

## Vibe Coding Workflow
1. **Spec First**: Always align with `docs/PRD.md` and `docs/API_SPEC.md`.
2. **Contract First**: Define Pydantic request/response schemas before implementing endpoints and UI components.
3. **Small & Incremental**: One feature per prompt and commit. Big "build everything" prompts create tangled bugs.
4. **State Plan Before Code**: Briefly describe the implementation plan before writing or modifying code.
5. **Never Accept Untested Code**: Run tests or verify execution before considering a feature done.
