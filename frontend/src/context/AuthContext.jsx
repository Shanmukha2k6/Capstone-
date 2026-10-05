import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, googleProvider, isFirebaseConfigured } from "../firebase/config";
import { POPUP_FALLBACK_CODES } from "../firebase/authErrors";
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "firebase/auth";

const LEGACY_KEYS = ["devmind_gh_token", "devmind_guest_session", "devmind_demo_user"];
const GITHUB_TOKEN_KEY = "devmind_github_token";
const clearLegacyStorage = () => {
  try { LEGACY_KEYS.forEach((key) => localStorage.removeItem(key)); } catch { /* storage unavailable */ }
};
const readStoredToken = () => {
  try { return localStorage.getItem(GITHUB_TOKEN_KEY) || ""; } catch { return ""; }
};

const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(auth));
  const [githubToken, setGithubToken] = useState(readStoredToken);
  const [authError, setAuthError] = useState(null);

  // Persist the GitHub token on this device only so it survives reloads; it is never sent to DevMind storage.
  const saveGithubToken = (token) => {
    const value = (token || "").trim();
    setGithubToken(value);
    try {
      if (value) localStorage.setItem(GITHUB_TOKEN_KEY, value);
      else localStorage.removeItem(GITHUB_TOKEN_KEY);
    } catch { /* storage unavailable */ }
  };

  useEffect(() => {
    clearLegacyStorage();
    if (!auth) return undefined;
    getRedirectResult(auth).catch(setAuthError);
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
  }, []);

  const loginWithGoogle = async () => {
    if (!auth) throw new Error("Google sign-in is not configured for this deployment yet.");
    try {
      return await signInWithPopup(auth, googleProvider);
    } catch (error) {
      if (!POPUP_FALLBACK_CODES.has(error?.code)) throw error;
      return signInWithRedirect(auth, googleProvider);
    }
  };
  const logout = async () => {
    if (auth) await signOut(auth);
    setUser(null);
    saveGithubToken("");
  };

  return (
    <AuthContext.Provider value={{ user, loading, githubToken, saveGithubToken,
      authError, clearAuthError: () => setAuthError(null), loginWithGoogle, logout, isFirebaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => useContext(AuthContext);
