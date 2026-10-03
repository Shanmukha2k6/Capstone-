import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth, connectAuthEmulator, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, deleteUser,
} from "firebase/auth";

if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error("Run this script through firebase emulators:exec --only auth --project demo-devmind.");
}
const app = initializeApp({ apiKey: "demo-api-key", projectId: "demo-devmind", appId: "demo-app-id" });
const auth = getAuth(app);
connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
const email = `sample-${Date.now()}@example.test`;
try {
  const created = await createUserWithEmailAndPassword(auth, email, "sample-password-123");
  const uid = created.user.uid;
  await signOut(auth);
  assert.equal(auth.currentUser, null);
  await assert.rejects(signInWithEmailAndPassword(auth, email, "wrong-password"));
  const signedIn = await signInWithEmailAndPassword(auth, email, "sample-password-123");
  assert.equal(signedIn.user.uid, uid);
  await deleteUser(signedIn.user);
  assert.equal(auth.currentUser, null);
  console.log("Firebase Auth emulator: signup, signout, wrong password, and login passed.");
} finally {
  await deleteApp(app);
}
