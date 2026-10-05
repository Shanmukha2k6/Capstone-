import React, { useState } from "react";
import { ArrowRight, Command, Menu, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const LINKS = [["#features", "Features"], ["#workflow", "How it works"], ["#security", "Security"], ["#faq", "FAQ"]];

export function BrandLogo() {
  return <span className="lp-brand"><span className="brand-mark"><Command size={20} /></span>devmind<span className="brand-ai">AI</span></span>;
}

export default function LandingNav({ onOpenApp, onSignIn }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <header className="lp-nav">
      <div className="lp-container lp-nav-inner">
        <a href="#top" aria-label="DevMind home" onClick={close}><BrandLogo /></a>
        <nav className={`lp-nav-links ${open ? "open" : ""}`} aria-label="Site navigation">
          {LINKS.map(([href, label]) => <a key={href} href={href} onClick={close}>{label}</a>)}
          {!user && <button className="lp-link-button lp-nav-signin" onClick={onSignIn}>Sign in</button>}
        </nav>
        <div className="lp-nav-actions">
          {!user && <button className="lp-link-button" onClick={onSignIn}>Sign in</button>}
          <button className="button-dark button-small" onClick={onOpenApp}>{user ? "Open dashboard" : "Get started"} <ArrowRight size={15} /></button>
          <button className="icon-button lp-menu" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}
