import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { writeSecurityRecord } from "../src/firebase/securityStore.js";

const rules = await readFile(new URL("../../firestore.rules", import.meta.url), "utf8");
const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8088").split(":");
const environment = await initializeTestEnvironment({ projectId: "demo-devmind", firestore: { host, port: Number(port), rules } });
const alice = environment.authenticatedContext("alice").firestore();
const bob = environment.authenticatedContext("bob").firestore();
const anonymous = environment.unauthenticatedContext().firestore();
const project = { id: "project", owner: "demo", repo: "repo", fullName: "demo/repo", createdAt: "2026-10-01", updatedAt: "2026-10-01", files: [{ path: "main.js", size: 20 }], fileCount: 1 };
const review = { id: "review", projectId: "project", createdAt: "2026-10-01", report: { repository: "demo/repo", provider: "gemini", revision: "a".repeat(40), findings: [{ evidence: "send()" }] }, findingIds: ["evidence"] };
const decision = { id: "review_evidence", reviewId: "review", findingId: "evidence", status: "open", note: "", updatedAt: "2026-10-01" };
let checks = 0;
async function passes(operation) { await assertSucceeds(operation); checks++; }
async function fails(operation) { await assertFails(operation); checks++; }
try {
  await environment.clearFirestore();
  await passes(setDoc(doc(alice, "users/alice/projects/project"), project));
  await passes(getDoc(doc(alice, "users/alice/projects/project")));
  await fails(getDoc(doc(bob, "users/alice/projects/project")));
  await fails(getDoc(doc(anonymous, "users/alice/projects/project")));
  await fails(setDoc(doc(bob, "users/alice/projects/project"), project));
  await passes(updateDoc(doc(alice, "users/alice/projects/project"), { fileCount: 2, updatedAt: "2026-10-02" }));
  await fails(updateDoc(doc(alice, "users/alice/projects/project"), { fullName: "evil/repo" }));
  await fails(setDoc(doc(alice, "users/alice/reviews/missing"), { ...review, id: "missing", projectId: "unknown" }));
  await fails(setDoc(doc(alice, "users/alice/reviews/mock"), { ...review, id: "mock", report: { ...review.report, provider: "mock" } }));
  await passes(setDoc(doc(alice, "users/alice/reviews/review"), review));
  await passes(writeSecurityRecord(alice, "alice", "reviews", review));
  await assert.rejects(writeSecurityRecord(alice, "alice", "reviews", { ...review, createdAt: "changed" }), /immutable review/); checks++;
  await fails(updateDoc(doc(alice, "users/alice/reviews/review"), { createdAt: "2026-10-02" }));
  await fails(getDoc(doc(bob, "users/alice/reviews/review")));
  await passes(setDoc(doc(alice, "users/alice/decisions/review_evidence"), decision));
  await fails(setDoc(doc(alice, "users/alice/decisions/review_evidence"), { ...decision, status: "resolved", note: " " }));
  await fails(setDoc(doc(alice, "users/alice/decisions/review_evidence"), { ...decision, status: "accepted_risk", note: "" }));
  await passes(setDoc(doc(alice, "users/alice/decisions/review_evidence"), { ...decision, status: "resolved", note: "Verified a fix.\nRechecked the source." }));
  await fails(setDoc(doc(alice, "users/alice/decisions/review_unknown"), { ...decision, id: "review_unknown", findingId: "unknown" }));
  await fails(getDoc(doc(bob, "users/alice/decisions/review_evidence")));
  assert.equal((await getDoc(doc(alice, "users/alice/decisions/review_evidence"))).data().status, "resolved");
  console.log(`${checks} Firebase security-rule and immutable-write checks passed.`);
} finally { await environment.cleanup(); }
