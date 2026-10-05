import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, githubProvider, isFirebaseConfigured } from "../firebase/config";
import { POPUP_FALLBACK_CODES } from "../firebase/authErrors";
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signInWithRedirect,
  getRedirectResult, sendPasswordResetEmail, signOut, onAuthStateChanged, GithubAuthProvider,
} from "firebase/auth";

const GUEST_KEY = "devmind_guest_session";
const GUEST_USER = Object.freeze({ uid: "local-guest", displayName: "Demo Guest", isGuest: true });

const storage = {
  get: (key) => { try { return localStorage.getItem(key); } catch { return null; } },
  set: (key, value) => { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } },
  remove: (key) => { try { localStorage.removeItem(key); } catch { /* storage unavailable */ } },
};
const readGuest = () => (storage.get(GUEST_KEY) === "1" ? GUEST_USER : null);
const tokenFrom = (result) => GithubAuthProvider.credentialFromResult(result)?.accessToken || "";

const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => (auth ? null : readGuest()));
  const [loading, setLoading] = useState(Boolean(auth));
  const [githubToken, setGithubToken] = useState("");
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    storage.remove("devmind_gh_token");
    if (!auth) return undefined;
    getRedirectResult(auth)
      .then((result) => { if (result) setGithubToken(tokenFrom(result)); })
      .catch(setAuthError);
    return onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) storage.remove(GUEST_KEY);
      setUser(currentUser || readGuest());
      setLoading(false);
    });
  }, []);

  const requireFirebase = () => {
    if (!auth) throw new Error("Account sign-in is not configured for this deployment. Continue as a guest instead.");
  };
  const loginWithEmail = (email, password) => {
    requireFirebase();
    return signInWithEmailAndPassword(auth, email.trim(), password);
  };
  const registerWithEmail = (email, password) => {
    requireFirebase();
    return createUserWithEmailAndPassword(auth, email.trim(), password);
  };
  const resetPassword = (email) => {
    requireFirebase();
    return sendPasswordResetEmail(auth, email.trim());
  };
  const loginWithGithub = async () => {
    requireFirebase();
    try {
      const result = await signInWithPopup(auth, githubProvider);
      setGithubToken(tokenFrom(result));
      return result;
    } catch (error) {
      if (!POPUP_FALLBACK_CODES.has(error?.code)) throw error;
      return signInWithRedirect(auth, githubProvider);
    }
  };
  const loginAsGuest = async () => {
    if (auth?.currentUser) await signOut(auth);
    storage.set(GUEST_KEY, "1");
    setGithubToken("");
    setUser(GUEST_USER);
  };
  const logout = async () => {
    storage.remove(GUEST_KEY);
    storage.remove("devmind_demo_user");
    if (auth) await signOut(auth);
    setUser(null);
    setGithubToken("");
  };

  return (
    <AuthContext.Provider value={{ user, loading, githubToken, saveGithubToken: setGithubToken,
      authError, clearAuthError: () => setAuthError(null),
      loginWithEmail, registerWithEmail, resetPassword, loginWithGithub, loginAsGuest, logout, isFirebaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => useContext(AuthContext);
