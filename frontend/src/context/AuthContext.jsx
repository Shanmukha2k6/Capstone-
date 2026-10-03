import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, githubProvider, isFirebaseConfigured } from "../firebase/config";
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup,
  signOut, onAuthStateChanged, GithubAuthProvider,
} from "firebase/auth";

const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(auth));
  const [githubToken, setGithubToken] = useState("");

  useEffect(() => {
    localStorage.removeItem("devmind_gh_token");
    if (!auth) return;
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setGithubToken("");
      setLoading(false);
    });
  }, []);

  const requireFirebase = () => {
    if (!auth) throw new Error("Connect Firebase in frontend/.env to sign in, or continue as a local guest.");
  };
  const loginWithEmail = (email, password) => {
    requireFirebase();
    return signInWithEmailAndPassword(auth, email, password);
  };
  const registerWithEmail = (email, password) => {
    requireFirebase();
    return createUserWithEmailAndPassword(auth, email, password);
  };
  const loginWithGithub = async () => {
    requireFirebase();
    const result = await signInWithPopup(auth, githubProvider);
    setGithubToken(GithubAuthProvider.credentialFromResult(result)?.accessToken || "");
    return result;
  };
  const loginAsGuest = async () => {
    if (auth?.currentUser) await signOut(auth);
    setGithubToken("");
    setUser({ uid: "local-guest", displayName: "Demo Guest", isGuest: true });
  };
  const logout = async () => {
    if (auth) await signOut(auth);
    setUser(null);
    setGithubToken("");
    localStorage.removeItem("devmind_demo_user");
  };

  return (
    <AuthContext.Provider value={{ user, loading, githubToken, saveGithubToken: setGithubToken,
      loginWithEmail, registerWithEmail, loginWithGithub, loginAsGuest, logout, isFirebaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => useContext(AuthContext);
