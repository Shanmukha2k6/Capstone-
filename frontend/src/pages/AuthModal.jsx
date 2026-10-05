import React, { useEffect, useState } from "react";
import { X, ShieldCheck, Cloud, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getAuthErrorMessage, SILENT_CODES } from "../firebase/authErrors";

const FEATURES = [
  { icon: Sparkles, text: "AI code reviews, explanations, and refactors" },
  { icon: ShieldCheck, text: "Repository security scans with tracked decisions" },
  { icon: Cloud, text: "History synced securely across your devices" },
];

function GoogleLogo() {
  return (
    <svg className="auth-google-logo" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default function AuthModal({ isOpen, onClose }) {
  const { loginWithGoogle, isFirebaseConfigured, authError, clearAuthError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleClose = () => {
    if (loading) return;
    setError(null);
    clearAuthError();
    onClose();
  };
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!isOpen) return null;
  const shownError = error || (authError ? getAuthErrorMessage(authError) : null);

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    clearAuthError();
    try {
      await loginWithGoogle();
      onClose();
    } catch (err) {
      if (!SILENT_CODES.has(err?.code)) setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-backdrop" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="auth-card">
        <button onClick={handleClose} aria-label="Close sign-in" className="auth-close"><X size={16} /></button>

        <div className="auth-hero">
          <img src="/images/devmind-orbit.png" alt="" className="auth-hero-img" />
          <div className="auth-hero-glow" />
          <div className="auth-brand"><span className="auth-brand-mark"><Sparkles size={16} /></span>DevMind AI</div>
        </div>

        <div className="auth-body">
          <div className="text-center space-y-1.5">
            <h2 id="auth-title" className="text-xl font-semibold text-gpt-text tracking-tight">Welcome to DevMind</h2>
            <p className="text-sm text-gpt-muted">Sign in to save your work and pick up where you left off.</p>
          </div>

          <ul className="auth-features">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text}><span className="auth-feature-icon"><Icon size={14} /></span>{text}</li>
            ))}
          </ul>

          {!isFirebaseConfigured && (
            <div role="status" className="auth-alert auth-alert-warn">Google sign-in isn't configured on this deployment yet.</div>
          )}
          {shownError && <div role="alert" className="auth-alert auth-alert-error">{shownError}</div>}

          <button onClick={handleGoogle} disabled={loading || !isFirebaseConfigured} className="auth-google-btn">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <GoogleLogo />}
            <span>{loading ? "Signing in…" : "Continue with Google"}</span>
          </button>

          <p className="auth-footnote">We only use your Google name, email, and photo to create your workspace.</p>
        </div>
      </div>
    </div>
  );
}
