import React from "react";
import { ArrowRight, FileCode2, GitBranch, ShieldAlert, Sparkles } from "lucide-react";

const PREVIEW_FINDINGS = [
  { severity: "high", title: "Install script downloads and runs a remote payload", file: "scripts/postinstall.js:14" },
  { severity: "medium", title: "Environment variables sent to an external host", file: "src/telemetry.ts:42" },
  { severity: "low", title: "Obfuscated string decoded at runtime", file: "lib/utils/encode.js:7" },
];

function ProductPreview() {
  return (
    <div className="lp-preview" aria-label="Example DevMind findings view">
      <div className="lp-preview-bar"><span className="code-lights"><i /><i /><i /></span><span>devmind.app / findings</span><span className="lp-preview-tag">Example</span></div>
      <div className="lp-preview-body">
        <div className="lp-preview-head">
          <div><strong>acme/payments-sdk</strong><span><GitBranch size={12} /> main · 3f9c2a1</span></div>
          <span className="lp-coverage">48 / 52 files reviewed</span>
        </div>
        {PREVIEW_FINDINGS.map((item) => (
          <div className="lp-preview-row" key={item.file}>
            <span className={`lp-sev lp-sev-${item.severity}`}>{item.severity}</span>
            <div><strong>{item.title}</strong><span><FileCode2 size={12} /> {item.file}</span></div>
          </div>
        ))}
        <div className="lp-preview-note"><Sparkles size={13} /> Reviewer note: confirmed with maintainer — risk accepted for v2.1</div>
      </div>
    </div>
  );
}

export default function LandingHero({ onOpenApp }) {
  return (
    <section className="lp-hero" id="top">
      <div className="lp-glow" aria-hidden="true" />
      <div className="lp-container lp-hero-grid">
        <div className="lp-hero-copy">
          <span className="lp-pill"><ShieldAlert size={14} /> AI repository security reviews · Free beta</span>
          <h1>Review any repository <span className="lp-gradient-text">before you trust it.</span></h1>
          <p>DevMind connects a GitHub repository, reviews a fixed commit with AI, links every indicator to source evidence, and keeps your decisions and reports in one workspace.</p>
          <div className="lp-hero-actions">
            <button className="button-dark lp-cta" onClick={onOpenApp}>Start free <ArrowRight size={17} /></button>
            <a className="lp-ghost-button" href="#workflow">See how it works</a>
          </div>
          <ul className="lp-hero-points"><li>No credit card</li><li>Use your own Gemini key</li><li>Code is never executed</li></ul>
        </div>
        <ProductPreview />
      </div>
    </section>
  );
}
