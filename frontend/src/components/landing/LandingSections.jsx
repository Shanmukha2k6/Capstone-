import React from "react";
import { Bug, ClipboardCheck, FileDown, FolderGit2, GitCompare, KeyRound, Lock, MessageSquare, ScanSearch, ShieldCheck, Sparkles, Wand2 } from "lucide-react";

const FEATURES = [
  { icon: ScanSearch, tone: "purple", title: "Commit-pinned reviews", text: "Every review is tied to an exact revision, so findings never drift from the code they describe." },
  { icon: ClipboardCheck, tone: "mint", title: "Findings inbox", text: "Filter by severity, record decisions, and require a note before anything is marked resolved." },
  { icon: GitCompare, tone: "blue", title: "Coverage-aware comparison", text: "Compare runs on files both reviews covered — absence is never mislabeled as a fix." },
  { icon: FileDown, tone: "coral", title: "Exportable reports", text: "Download Markdown with source links, coverage, limitations, and reviewer notes." },
  { icon: MessageSquare, tone: "purple", title: "Project Q&A", text: "Ask questions about loaded source files with answers that cite file paths and lines." },
  { icon: Wand2, tone: "mint", title: "Snippet tools", text: "Explain, debug, refactor, and document individual snippets in a Monaco-powered workspace." },
];

const STEPS = [
  { icon: FolderGit2, title: "Connect", text: "Pick a public GitHub repository. DevMind saves its identity and file inventory." },
  { icon: Sparkles, title: "Review", text: "Run a bounded AI source review against a fixed commit with visible coverage." },
  { icon: Bug, title: "Decide", text: "Triage each finding, add notes, and track what's in review or accepted." },
  { icon: FileDown, title: "Export", text: "Share a revision-linked report your team can audit later." },
];

const TRUST = [
  { icon: Lock, title: "Code is data, never executed", text: "Submitted source is strictly delimited and analysed statically — nothing runs." },
  { icon: KeyRound, title: "Keys stay out of your records", text: "Gemini keys and GitHub tokens are never written to project or review storage." },
  { icon: ShieldCheck, title: "Owner-scoped storage", text: "Signed-in data lives in Firestore collections only you can read and write." },
];

export function FeatureGrid() {
  return (
    <section className="lp-section" id="features">
      <div className="lp-container">
        <div className="lp-section-head"><span className="lp-eyebrow">Features</span><h2>Everything a security review needs, nothing it doesn't.</h2>
          <p>AI helps inspect the source. DevMind manages the workflow around it.</p></div>
        <div className="lp-feature-grid">{FEATURES.map(({ icon: Icon, tone, title, text }) => (
          <article className="lp-card" key={title}><span className={`lp-icon lp-tone-${tone}`}><Icon size={20} /></span><h3>{title}</h3><p>{text}</p></article>
        ))}</div>
      </div>
    </section>
  );
}

export function Workflow() {
  return (
    <section className="lp-section lp-section-alt" id="workflow">
      <div className="lp-container">
        <div className="lp-section-head"><span className="lp-eyebrow">How it works</span><h2>From repository to report in four steps.</h2></div>
        <ol className="lp-steps">{STEPS.map(({ icon: Icon, title, text }, index) => (
          <li key={title}><span className="lp-step-num">0{index + 1}</span><span className="lp-icon lp-tone-purple"><Icon size={20} /></span><h3>{title}</h3><p>{text}</p></li>
        ))}</ol>
      </div>
    </section>
  );
}

export function TrustSection() {
  return (
    <section className="lp-section" id="security">
      <div className="lp-container lp-trust">
        <div className="lp-section-head lp-left"><span className="lp-eyebrow">Security by design</span><h2>Built for code you don't trust yet.</h2>
          <p>DevMind performs static source review. It doesn't certify a repository as malware-free — it shows you the evidence and lets you decide.</p></div>
        <div className="lp-trust-list">{TRUST.map(({ icon: Icon, title, text }) => (
          <div className="lp-trust-item" key={title}><span className="lp-icon lp-tone-mint"><Icon size={18} /></span><div><h3>{title}</h3><p>{text}</p></div></div>
        ))}</div>
      </div>
    </section>
  );
}
