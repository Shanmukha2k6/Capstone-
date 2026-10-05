import React, { useState } from "react";
import { X, Github, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getAuthErrorMessage, SILENT_CODES } from "../firebase/authErrors";

export default function AuthModal({ isOpen, onClose }) {
  const { loginWithEmail, registerWithEmail, resetPassword, loginWithGithub, loginAsGuest,
    isFirebaseConfigured, authError, clearAuthError } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  if (!isOpen) return null;
  const shownError = error || (authError ? getAuthErrorMessage(authError) : null);

  const run = async (action, { close = true } = {}) => {
    setLoading(true);
    setError(null);
    setNotice(null);
    clearAuthError();
    try {
      await action();
      if (close) onClose();
    } catch (err) {
      if (!SILENT_CODES.has(err?.code)) setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    run(() => (isRegister ? registerWithEmail(email, password) : loginWithEmail(email, password)));
  };
  const handleGithub = () => run(loginWithGithub);
  const handleGuest = () => run(loginAsGuest);
  const handleReset = () => {
    if (!email.trim()) { setError("Enter your email above, then click \"Forgot password?\" again."); return; }
    run(async () => {
      await resetPassword(email);
      setNotice(`If an account exists for ${email.trim()}, a reset link is on its way.`);
    }, { close: false });
  };
  const handleClose = () => { if (!loading) { clearAuthError(); onClose(); } };
  const switchMode = (register) => { setIsRegister(register); setError(null); setNotice(null); };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm flex items-center justify-center p-4 select-none" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="w-full max-w-sm max-h-[calc(100dvh-32px)] overflow-y-auto bg-gpt-surface border border-gpt-border rounded-3xl shadow-2xl p-6 space-y-5 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={handleClose}
          aria-label="Close sign-in"
          className="absolute right-4 top-4 text-gpt-muted hover:text-gpt-text p-1 rounded-full transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="auth-art"><img src="/images/devmind-orbit.png" alt="" /></div>
        <div className="space-y-1 text-center">
          <div className="w-10 h-10 rounded-full bg-gpt-sidebar border border-gpt-border flex items-center justify-center mx-auto mb-2 text-gpt-accent">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 id="auth-title" className="text-lg font-semibold text-gpt-text">
            {isRegister ? "Create your account" : "Welcome back"}
          </h2>
          <p className="text-xs text-gpt-muted">
            {isFirebaseConfigured ? "Sign in to sync your analyses across devices." : "Account sign-in isn't configured on this deployment yet."}
          </p>
        </div>

        {!isFirebaseConfigured && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs text-center">
            Email and GitHub sign-in need Firebase settings (VITE_FIREBASE_*). You can still continue as a guest.
          </div>
        )}

        {shownError && (
          <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center">
            {shownError}
          </div>
        )}

        {notice && (
          <div role="status" className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs text-center">
            {notice}
          </div>
        )}

        {/* GitHub OAuth Button */}
        <button
          onClick={handleGithub}
          disabled={loading || !isFirebaseConfigured}
          className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-full bg-gpt-sidebar hover:bg-gpt-surfaceHover disabled:opacity-40 disabled:cursor-not-allowed border border-gpt-border text-gpt-text text-xs font-medium transition"
        >
          <Github className="w-4 h-4" />
          <span>Continue with GitHub</span>
        </button>

        <div className="flex items-center space-x-2">
          <div className="flex-1 h-px bg-gpt-border/60" />
          <span className="text-[11px] text-gpt-muted uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-gpt-border/60" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            aria-label="Email address"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full bg-gpt-sidebar border border-gpt-border rounded-xl px-3.5 py-2 text-xs text-gpt-text placeholder-gpt-muted focus:outline-none focus:border-violet-400"
          />

          <input
            type="password"
            aria-label="Password"
            minLength={6}
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-gpt-sidebar border border-gpt-border rounded-xl px-3.5 py-2 text-xs text-gpt-text placeholder-gpt-muted focus:outline-none focus:border-violet-400"
          />

          {!isRegister && isFirebaseConfigured && (
            <div className="text-right">
              <button type="button" onClick={handleReset} disabled={loading} className="text-[11px] text-gpt-muted hover:text-gpt-text transition">
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isFirebaseConfigured}
            className="w-full py-2.5 rounded-full bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition"
          >
            {loading ? "Please wait..." : isRegister ? "Sign Up" : "Continue"}
          </button>
        </form>

        {/* Guest Demo button */}
        <div className="text-center">
          <button
            onClick={handleGuest}
            disabled={loading}
            className="text-xs text-gpt-muted hover:text-gpt-text transition"
          >
            Continue as Guest &rarr;
          </button>
        </div>

        {/* Switch mode */}
        <div className="text-center text-xs text-gpt-muted border-t border-gpt-border/60 pt-3">
          {isRegister ? (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode(false)}
                className="text-gpt-text hover:underline font-medium"
              >
                Log in
              </button>
            </p>
          ) : (
            <p>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode(true)}
                className="text-gpt-text hover:underline font-medium"
              >
                Sign up
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
