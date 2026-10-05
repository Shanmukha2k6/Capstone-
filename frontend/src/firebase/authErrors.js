const host = () => (typeof window === "undefined" ? "this domain" : window.location.hostname);

const MESSAGES = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/invalid-login-credentials": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-not-found": "No account found with that email. Sign up instead?",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/missing-password": "Enter your password.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/email-already-in-use": "An account with this email already exists. Log in instead.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
  "auth/popup-closed-by-user": "Sign-in window was closed before finishing.",
  "auth/user-cancelled": "Google sign-in was cancelled.",
  "auth/cancelled-popup-request": "Sign-in window was closed before finishing.",
  "auth/account-exists-with-different-credential":
    "This email is already linked to a different sign-in method.",
  "auth/operation-not-allowed":
    "This sign-in method is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.",
  "auth/invalid-api-key": "Firebase API key is invalid. Check the VITE_FIREBASE_* environment variables.",
  "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
    "Firebase API key is invalid. Check the VITE_FIREBASE_* environment variables.",
  "auth/configuration-not-found":
    "Firebase Authentication is not set up for this project. Enable it in Firebase Console.",
};

export const SILENT_CODES = new Set(["auth/popup-closed-by-user", "auth/cancelled-popup-request"]);
export const POPUP_FALLBACK_CODES = new Set([
  "auth/popup-blocked", "auth/operation-not-supported-in-this-environment",
]);

export function getAuthErrorMessage(error) {
  const code = error?.code || "";
  if (code === "auth/unauthorized-domain") {
    return `${host()} is not an authorized domain. Add it in Firebase Console → Authentication → Settings → Authorized domains.`;
  }
  if (MESSAGES[code]) return MESSAGES[code];
  const raw = error?.message || "Authentication failed. Please try again.";
  return raw.replace(/^Firebase:\s*/, "").replace(/\s*\(auth\/[^)]+\)\.?$/, "") || "Authentication failed.";
}
