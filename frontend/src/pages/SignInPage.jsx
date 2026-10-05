import React, { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Cloud, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getAuthErrorMessage, SILENT_CODES } from "../firebase/authErrors";
import { BrandLogo } from "../components/landing/LandingNav";
import "../signin.css";

const FEATURES = [
  { icon: Sparkles, title: "AI source reviews", text: "Commit-pinned findings with file and line evidence." },
  { icon: ShieldCheck, title: "Tracked decisions", text: "Notes and dispositions that stay with every finding." },
  { icon: Cloud, title: "Synced workspace", text: "Your projects and reviews on every device you sign in to." },
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

function BrandPanel() {
  return (
    <aside className="signin-brand-panel" aria-hidden="true">
      <img src="/images/devmind-orbit.png" alt="" className="signin-art" />
      <div className="signin-brand-top"><BrandLogo /></div>
      <div className="signin-brand-copy">
        <h2>Review any repository before you trust it.</h2>
        <ul>{FEATURES.map(({ icon: Icon, title, text }) => (
          <li key={title}><span className="signin-feature-icon"><Icon size={16} /></span><div><strong>{title}</strong><span>{text}</span></div></li>
        ))}</ul>
      </div>
      <p className="signin-brand-foot">Submitted code is analysed as data — it is never executed.</p>
    </aside>
  );
}

export default function SignInPage({ onBack, onSignedIn, onContinueAsGuest }) {
  const { user, loginWithGoogle, isFirebaseConfigured, authError, clearAuthError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => { if (user) onSignedIn(); }, [user, onSignedIn]);
  const shownError = error || (authError ? getAuthErrorMessage(authError) : null);

  const handleGoogle = async () => {
    setLoading(true); setError(null); clearAuthError();
    try { await loginWithGoogle(); }
    catch (err) { if (!SILENT_CODES.has(err?.code)) setError(getAuthErrorMessage(err)); }
    finally { setLoading(false); }
  };

  return (
    <div className="signin-page">
      <BrandPanel />
      <main className="signin-main">
        <button className="signin-back" onClick={onBack}><ArrowLeft size={16} /> Back to home</button>
        <div className="signin-form">
          <span className="signin-mobile-logo"><BrandLogo /></span>
          <h1>Sign in to DevMind</h1>
          <p className="signin-sub">Save your projects, reviews, and decisions to your account.</p>
          {!isFirebaseConfigured && <div role="status" className="auth-alert auth-alert-warn">Google sign-in isn't configured on this deployment yet.</div>}
          {shownError && <div role="alert" className="auth-alert auth-alert-error">{shownError}</div>}
          <button onClick={handleGoogle} disabled={loading || !isFirebaseConfigured} className="auth-google-btn">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <GoogleLogo />}
            <span>{loading ? "Signing in…" : "Continue with Google"}</span>
          </button>
          <div className="signin-divider"><span>or</span></div>
          <button className="signin-guest" onClick={onContinueAsGuest}>Continue without an account <ArrowRight size={16} /></button>
          <p className="auth-footnote">Guest work is saved only in this browser. We use your Google name, email, and photo to create your workspace.</p>
        </div>
        <p className="signin-legal">© {new Date().getFullYear()} DevMind AI</p>
      </main>
    </div>
  );
}
