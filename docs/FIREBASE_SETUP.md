# DevMind Firebase sample

This sample uses React, Firebase Authentication, Firestore analysis history, and the existing FastAPI analysis service. No MongoDB or Docker is needed.

## Try the sample

The guest demo requires no Firebase account or AI key. Guest analyses are saved only on this device; email sign-in is disabled until Firebase is configured. Mock analysis outputs are illustrative fixtures, not a real scan of the submitted code.

From the project directory, run the backend in one terminal:

```powershell
cd backend
$env:LLM_PROVIDER = "mock"
.\venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

If the virtual environment does not exist, create it with `python -m venv venv` and install `requirements.txt` using that environment's pip.

Use Node.js 24 LTS (or a compatible Node version supported by Vite/Vitest). Run the frontend in a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173, choose **Sign In → Continue as Guest**, open **Code Workspace**, run a tool, and open **Analysis History**. Refresh to check persistence. **Open in Editor** restores the complete code, language, tool, and saved result.

## Connect Firebase cloud

1. Create/select a project in the [Firebase console](https://console.firebase.google.com/).
2. Register a Web app in Project settings. Copy its config values into the four `VITE_FIREBASE_*` entries in `frontend/.env`. Use `frontend/.env.example` as the reference; preserve your existing API URL.
3. Enable **Authentication → Email/Password**. Add `localhost` to authorized domains for local development if needed. GitHub sign-in is optional: enable the GitHub provider and configure its callback URL and OAuth credentials in the Firebase console.
4. Create a **Cloud Firestore** database. Rules deny access by default; deploy this project's rules before signing in.
5. From the project root:

```powershell
firebase login
firebase deploy --only firestore --project YOUR_PROJECT_ID
```

6. Restart Vite. Sign up, run an analysis, then sign in on another browser to check sync.

Analyses live at `users/{uid}/analyses/{analysisId}`. Only that authenticated user may read, create, or delete them. Documents are immutable. The UI displays the newest 50; **Clear all history** deletes all analyses for the current account. Guest history stays separate and is never automatically uploaded. Chat, quality reports, and repository sessions are not persisted by this sample.

## Optional Firebase emulators

Use the [Local Emulator Suite](https://firebase.google.com/docs/emulator-suite) to exercise real Firebase SDK calls without a cloud project. Install Java 21+ and the Firebase CLI. This machine currently has Java 8, so Firestore emulator verification was not performed.

Leave the four cloud config values blank and set `VITE_USE_FIREBASE_EMULATORS=true` in `frontend/.env`. Start from the project root:

```powershell
firebase emulators:start --project demo-devmind --only auth,firestore
```

Restart Vite. Sign up with a test email and password. The Emulator UI is at http://127.0.0.1:4000. Only bind to localhost. Emulator data is temporary unless explicitly exported.

## Netlify deployment (sign-in checklist)

Vite inlines `VITE_*` variables at **build time**, so a deploy built without them ships with account sign-in disabled (only guest mode works).

1. Netlify → **Site configuration → Environment variables**: add `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, and `VITE_API_URL`. Do not set `VITE_USE_FIREBASE_EMULATORS`.
2. Firebase Console → **Authentication → Settings → Authorized domains**: add your `*.netlify.app` domain and any custom domain. Without this, sign-in fails with "not an authorized domain".
3. Firebase Console → **Authentication → Sign-in method**: enable Email/Password (and GitHub, with the callback URL `https://<project-id>.firebaseapp.com/__/auth/handler` set in your GitHub OAuth app).
4. **Trigger a new deploy** (Deploys → Trigger deploy → Clear cache and deploy site) so the variables are baked into the bundle.

GitHub sign-in uses a popup and automatically falls back to a full-page redirect when popups are blocked (common on mobile).

## Firebase Hosting

For cloud builds, set `VITE_USE_FIREBASE_EMULATORS=false` and supply the real Firebase web config. Set `VITE_API_URL` to your deployed HTTPS FastAPI service's `/api` URL before building. Add your Hosting domain to the backend's `ALLOWED_ORIGINS` and Firebase Auth authorized domains.

```powershell
cd frontend
npm run build
cd ..
firebase deploy --only hosting,firestore --project YOUR_PROJECT_ID
```

Hosting serves the built React app; it does not run the Python backend. Keep AI provider keys on the backend. The current backend is a sample with no authentication enforcement or per-user quotas; protect it before public deployment with paid AI keys.

## Verification

```powershell
cd frontend
npm test
npm run build
cd ../backend
$env:LLM_PROVIDER = "mock"
.\venv\Scripts\python.exe -m pytest app/tests -q
```

The frontend tests cover guest persistence, account isolation, listener cleanup, and failed Firebase operations using mocked storage adapters. The Firebase Auth emulator smoke test verified signup, signout, wrong-password rejection, and login using the actual SDK. To repeat it from the project root:

```powershell
firebase emulators:exec --only auth --project demo-devmind "node frontend/scripts/auth-smoke.mjs"
```

The repository-security increment also adds owner-scoped `projects`, immutable `reviews`, and mutable reviewer `decisions` collections. Deploy the updated `firestore.rules` along with the frontend before using cloud project records. These local checks do not validate deployed Firestore rules.

With Java 21 available, test the supplied security rules and immutable-review retry behavior against the isolated Firestore emulator:

```powershell
firebase emulators:exec --config firebase.rules-test.json --only firestore --project demo-devmind "npm --prefix frontend run test:rules"
```

The test emulator uses port 8088. Guest projects/reviews remain in browser local storage; signing in opens a separate account workspace and does not upload guest data automatically. API keys and GitHub tokens are excluded from saved project/review/decision records.
