# DevMind — Repository Security Review Workspace

DevMind is a SaaS MVP for reviewing suspicious behavior in GitHub source and tracking what a reviewer did about it. Its primary workflow is **connect repository → run Gemini source review → inspect commit-linked evidence → record a decision → export a report**.

Implemented product workflows:
- Saved repository identities and bounded text-file inventories across navigation/reloads.
- Bounded, real Gemini source reviews at a fixed commit; verified file/line/snippet references, explicit coverage and limitations. No demo security verdicts.
- Immutable saved review records, review history, and comparison by source-evidence fingerprints. Files outside new coverage are never marked fixed.
- A findings inbox with repository/severity/status/search filters and reviewer notes. Resolving findings or accepting risk requires a note; these are human decisions, not certified remediation.
- Downloadable Markdown reports with source links, scope, reviewer decisions, and comparison caveats.
- A minimal project Q&A interface with bounded lexical context selection over up to five recently opened source files. Source is session-only and fetched from the default branch; it is not the fixed security-review snapshot or an embedding index.
- Owner-scoped Firebase project/review/decision collections. Guest records stay local; no implicit guest-to-account migration. Credentials never enter these records.

**Product rationale:** AI models can inspect source. DevMind's deliverable is the repeatable review workflow and its saved decisions/evidence, not a claim to have a more capable model. See [positioning and demo script](docs/SAAS_PRODUCT.md).

**Status:** local SaaS MVP. Configure Firebase and deploy the supplied rules for cloud accounts; connect Gemini in Settings for real reviews. Billing, shared team permissions, background scans, CI enforcement, and production hosting are not implemented. Generic snippet tools remain secondary utilities and use illustrative output in mock mode. [Firebase setup](docs/FIREBASE_SETUP.md).

---

## Architecture & Tech Stack

```
React (Vite + Tailwind CSS + Monaco)
      |                |
(Auth & Firestore)   (REST + SSE Streaming)
      v                v
 Firebase Cloud    FastAPI Backend
                   |-- Services (LLM Gateway, GitHub Client, Prompt Loader)
                   |-- Prompts (Versioned YAML templates)
                   +-- Google Gemini / OpenAI Providers
```

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Monaco Editor, Recharts.
- **Auth & Database**: Firebase Authentication (Google sign-in) & owner-scoped Cloud Firestore records.
- **Backend API**: FastAPI (Python 3.11+), Pydantic v2, async HTTPX, Server-Sent Events (SSE).
- **AI Gateway**: Gemini source reviews and streaming chat use configured models and explicit provider errors. Other snippet adapters still support mock development output.

---

## Quick Start Guide

### 1. Backend Setup
1. Open a terminal in the root directory:
   ```bash
   cd backend
   ```
2. Activate the virtual environment:
   - On Windows:
     ```powershell
     .\venv\Scripts\activate
     ```
   - On Linux/Mac:
     ```bash
     source venv/bin/activate
     ```
3. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
4. API docs will be available at: [http://localhost:8000/docs](http://localhost:8000/docs)
5. Run the backend test suite:
   ```bash
   pytest -v app/tests
   ```

### 2. Frontend Setup
1. In a second terminal window:
   ```bash
   cd frontend
   npm run dev
   ```
2. Open your browser at: [http://localhost:5173](http://localhost:5173)

---

## Configuration & Environment Variables

### Backend (`backend/.env`)
```ini
LLM_PROVIDER=gemini        # "gemini" | "openai" | "mock"
GEMINI_API_KEY=your_key    # Get free key from https://aistudio.google.com/
GEMINI_MODEL=gemini-3.8-flash

OPENAI_API_KEY=your_key    # Optional OpenAI key
OPENAI_MODEL=gpt-4o-mini

GITHUB_TOKEN=your_pat      # Optional GitHub PAT for higher rate limits
```

### Frontend (`frontend/.env`)
```ini
VITE_API_URL=http://localhost:8000/api

# Firebase (Optional: app works out of the box in Demo Guest mode without keys!)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

---

## Documentation Links
- [Product Requirements Document (PRD)](file:///docs/PRD.md)
- [System Architecture](file:///docs/ARCHITECTURE.md)
- [API Specification](file:///docs/API_SPEC.md)
- [Prompt Library & Benchmarks](file:///docs/PROMPTS.md)
- [Development Rules & Vibe Coding Guidelines](file:///CLAUDE.md)
