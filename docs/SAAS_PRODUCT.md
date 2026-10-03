# DevMind product positioning

## A concrete answer to “Why use this if an AI can read code?”

“DevMind is a repository security review workspace. It connects a repository, reviews a fixed commit, links indicators to source evidence, lets a reviewer record a disposition, compares review coverage over time, and exports the resulting record. AI helps inspect the source; the product manages the review workflow.”

Avoid claiming a general-purpose assistant cannot inspect repositories or generate reports. Those capabilities overlap. Demonstrate the saved project → source review → finding decision → review history workflow. The reviewer should not need to recreate that workflow with prompts and manually maintained documents each time.

## Primary user and job

Developer maintainers reviewing unfamiliar GitHub code, dependency helpers, or suspicious install scripts. The job is deciding which source indicators need investigation and preserving the scope, evidence, and reviewer decision. DevMind offers static source review, not malware execution/detection certification.

## Implemented MVP demonstration

1. Connect a small public repository. Reload to show the saved project/file inventory is retained.
2. Add a valid Gemini key in Settings. Run a source review from the project; inspect its revision and reviewed/skipped coverage.
3. Open Findings inbox. Filter by severity and record an In review decision. Record a note before choosing Resolved by reviewer or Risk accepted.
4. Show the latest-review queue and the immutable original run in Review history.
5. Run another review, inspect exact-evidence comparison, and explain why omitted files are outside coverage rather than “fixed.” AI output may differ across runs, even at the same revision.
6. Export Markdown with source links, notes, coverage, and limitations. Open files and use the minimal Project Q&A as a supporting interface.

A successful live Gemini scan and hosted Firebase account flow must be demonstrated separately; passing mocked-provider/unit/emulator tests is not that demonstration. No saved fixture findings are injected into the real workspace for a demo.

## Persistence and boundaries

- Guest: `devmind_security_workspace_v1` in local storage. Authenticated account: `/users/{uid}/projects`, `/reviews`, `/decisions`, protected by owner checks.
- Project metadata: up to 25 repositories, 1,000 inventory entries per project; the total discovered file count remains visible. The full GitHub tree can be refreshed without renaming the project.
- Review retention: up to 100 saved runs; records above 700,000 serialized UTF-8 bytes are not persisted. The completed scan remains exportable if saving fails. Up to 1,000 decision records. Firebase subscriptions are bounded to 100 project/review records and 1,000 decisions.
- Source context: at most five recent opened files per project, 20,000 characters per file, memory only. Lexical chunks retain file paths and source line numbers. Reloading keeps project metadata but clears loaded source.
- Credentials: GitHub tokens remain in memory; Gemini keys remain in the backend's temporary credential store. Neither is written to the project/review database.
- Reports: original provider/evidence records are immutable under the client rules. Decisions are separate mutable owner records. These are owner-managed records, not cryptographically attested server audit logs.
- Guest data never appears automatically in a newly signed-in account. Failed cloud writes do not fall back into guest storage.

## Validation

Frontend workflow tests cover persistence, owner switching, save failures, evidence fingerprints, coverage comparison, note requirements, export content, and source-context selection. The Firebase emulator checks owner-only access, project identity stability, immutable reviews, valid review references, and required notes.

Run `npm --prefix frontend test` and `npm --prefix frontend run build`. With Java 21 and Firebase CLI installed, run from the repository root:

```powershell
firebase emulators:exec --config firebase.rules-test.json --only firestore --project demo-devmind "npm --prefix frontend run test:rules"
```

This uses Firebase's [official rules-testing workflow](https://firebase.google.com/docs/firestore/security/test-rules-emulator). A portable Java runtime used during development is stored in ignored `.test-tools/`; no machine Java settings are changed.

## Beyond this MVP

Production rollout requires configured Firebase, backend hosting, HTTPS and origin configuration, operational monitoring, and real-provider verification. Shared workspace roles, subscriptions/billing, GitHub App webhooks, scheduled incremental scans, and CI enforcement are future work. The interface does not pretend those capabilities already exist.
