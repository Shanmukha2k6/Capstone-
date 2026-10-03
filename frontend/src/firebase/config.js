import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator, GithubAuthProvider } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

export const useFirebaseEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true";
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (useFirebaseEmulators ? "demo-api-key" : ""),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (useFirebaseEmulators ? "demo-devmind.firebaseapp.com" : ""),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || (useFirebaseEmulators ? "demo-devmind" : ""),
  appId: import.meta.env.VITE_FIREBASE_APP_ID || (useFirebaseEmulators ? "demo-app-id" : ""),
};
const isRealValue = (value) => Boolean(value && !/^(your_|replace_)/i.test(value));
export const isFirebaseConfigured = Object.values(firebaseConfig).every(isRealValue);
export const app = isFirebaseConfigured ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const githubProvider = app ? new GithubAuthProvider() : null;
githubProvider?.addScope("read:user");

if (useFirebaseEmulators && !import.meta.env.DEV) {
  throw new Error("Disable VITE_USE_FIREBASE_EMULATORS before building for production.");
}
if (useFirebaseEmulators && app && !globalThis.__devmindEmulatorsConnected) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  globalThis.__devmindEmulatorsConnected = true;
}
