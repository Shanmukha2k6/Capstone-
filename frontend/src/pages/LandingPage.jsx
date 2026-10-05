import React from "react";
import LandingNav, { BrandLogo } from "../components/landing/LandingNav";
import LandingHero from "../components/landing/LandingHero";
import { FeatureGrid, TrustSection, Workflow } from "../components/landing/LandingSections";
import Faq from "../components/landing/LandingFaq";
import "../landing.css";

function Footer({ onOpenApp }) {
  return (
    <footer className="lp-footer">
      <div className="lp-container lp-footer-inner">
        <div><BrandLogo /><p>AI-assisted repository security reviews.</p></div>
        <nav aria-label="Footer">
          <a href="#features">Features</a><a href="#faq">FAQ</a>
          <button className="lp-link-button" onClick={onOpenApp}>Dashboard</button>
        </nav>
      </div>
      <div className="lp-container lp-footer-legal">© {new Date().getFullYear()} DevMind AI. AI output can be wrong — always verify findings.</div>
    </footer>
  );
}

export default function LandingPage({ onOpenApp, onSignIn }) {
  return (
    <div className="lp-root">
      <LandingNav onOpenApp={onOpenApp} onSignIn={onSignIn} />
      <main>
        <LandingHero onOpenApp={onOpenApp} />
        <FeatureGrid />
        <Workflow />
        <TrustSection />
        <Faq />
      </main>
      <Footer onOpenApp={onOpenApp} />
    </div>
  );
}
