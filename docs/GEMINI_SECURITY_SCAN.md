# Gemini repository security scan

The repository explorer now has **Gemini malware scan**. It reviews source for suspicious behaviors such as credential theft, exfiltration, persistence, destructive operations, unexpected remote execution, cryptomining, and obfuscated loaders.

## Add or change a key in Settings

Open the app at `http://localhost:5174/`, select **Settings**, paste your Gemini API key, and click **Save key**. The same key enables the **AI assistant** and repository security scans. Use **Replace key** to change it or **Remove session key** to clear it. You can get a key from [Google AI Studio](https://aistudio.google.com/apikey). No backend restart is needed for this method.

The password field is cleared after a successful save. The key is held only in backend memory for up to eight hours, isolated by an opaque HttpOnly, SameSite=Strict browser cookie. It is not returned by the API or saved to browser storage, Firebase, `.env`, or other project files. Backend restarts clear session credentials. The key is validated by Gemini when a chat message or scan runs; saving it does not prove that it is valid or has available quota.

This option applies to the AI assistant and repository malware-indicator reviews. Other AI tools retain the backend's configured provider. A session key overrides a server key for this browser; removing it restores any available server configuration. The session belongs to the browser, rather than a Firebase account, so remove it before sharing that browser.

The assistant sends the session cookie with chat requests, uses the request's Gemini key without changing global provider settings, and streams Gemini text through the backend. Its connection banner distinguishes Gemini from explicit sample mode. Provider errors, blocked replies, and interrupted streams are displayed as errors; failed replies are excluded from subsequent conversation context. Chat messages and attached source context are sent to Gemini. The chat stream uses Google's documented [streamGenerateContent endpoint](https://ai.google.dev/api/generate-content).

The sample runs as a single backend process. For deployment, serve the frontend and API on the same site over HTTPS, configure `ALLOWED_ORIGINS`, and replace the in-memory session store with an appropriate private credential store if using multiple workers.

## Configure a server key locally (alternative)

1. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey).
2. Edit `backend/.env` locally. Keep the key out of chat, frontend environment variables, and source control:

```dotenv
GEMINI_API_KEY=your_actual_key
GEMINI_MODEL=gemini-3.8-flash
```

3. Restart the backend from the `backend` directory:

```powershell
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Repository scans and chat use a saved Gemini key even when `LLM_PROVIDER=mock` for the other sample tools. Without a session or server Gemini key, chat follows the general provider and labels mock responses as sample mode. To use Gemini for other tools as well, set `LLM_PROVIDER=gemini` and restart; those non-streaming tools still have a separate legacy implementation outside the strict chat/scan failure handling.

The default model follows Google's current [model catalog](https://ai.google.dev/gemini-api/docs/models). The scanner uses the documented REST structured-output request in [Google's Generate Content guide](https://ai.google.dev/gemini-api/docs/generate-content/structured-output), validates the JSON result, and never substitutes mock findings when Gemini is unavailable.

### Request-format fix and troubleshooting

The REST `generationConfig.responseFormat.text.mimeType` field uses the enum `APPLICATION_JSON`, as documented in [TextResponseFormat](https://ai.google.dev/api/generate-content#TextResponseFormat). The older MIME string `application/json` belongs to a different configuration field and caused a bad request when used here. The scanner now sends the correct enum and keeps its Pydantic output validation.

Provider errors distinguish invalid keys, HTTP 400 request rejection, HTTP 403 API restrictions/permissions, HTTP 404 model availability, HTTP 429 quota, and temporary provider failures. Raw upstream error text is never returned because it may contain credentials or source. An HTTP 400 alone does not establish that a key is invalid. After a backend restart, save the temporary key again in Settings before retrying a review. Local regression tests pass; a live retry is needed to confirm access and quota for the user's API project.

## Run a scan

Open `http://localhost:5174/`, select **Repositories**, load a repository, select **Gemini malware scan**, choose a file limit, and click **Scan with Gemini**. If a key is missing, **Open Settings** leads to the key form. Topic links first show a repository picker. Public repositories generally work without a GitHub token; private repository access requires an authorized token.

The scan pins files to the same commit SHA. Each finding links to that revision and carries source evidence, inclusive line numbers, severity, explanation, and a review recommendation. Invalid source references are excluded and reported.

## Interpret the result

- **Potential malware indicators**: suspicious behaviors were identified in reviewed source; this does not establish malicious intent.
- **No indicators in scanned files**: the reviewed subset has no supported indicators; the repository is not certified safe.
- **Scan inconclusive**: Gemini returned findings that could not be verified against supplied source.
- **Configuration, quota, network, or response error**: no verdict was generated.

Review the coverage list. Scanning is bounded to the chosen number of files, with 20,000 characters per file and 100,000 total. Install scripts and configuration have priority. Large, empty, failed, and unselected eligible files are reported as skipped. Binaries, ignored directories, unsupported files, external dependency contents, and runtime behavior are not inspected. No repository code is installed or executed.

The model's confidence is an estimate, not a calibrated probability. Exact file/line/evidence matching checks citation validity, not whether a model's interpretation is correct. A full malware assessment can require dependency and binary analysis plus isolated dynamic investigation.
