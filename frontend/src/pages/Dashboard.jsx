import React, { useState } from "react";
import { ArrowUpRight, ArrowRight, Bug, BookOpen, Sparkles, FileCode2, Code2, History, MessageSquare, Zap, Plus } from "lucide-react";
import { SAMPLE_CODES } from "../components/CodeEditor";

const tools = [
  { id: "bugs", label: "Bug scanner", description: "Find bugs. Fix them faster.", icon: Bug, tone: "coral", lang: "python" },
  { id: "explain", label: "Explain code", description: "Turn complex into clear.", icon: BookOpen, tone: "blue", lang: "javascript" },
  { id: "refactor", label: "Refactor", description: "Less clutter. Better code.", icon: Sparkles, tone: "purple", lang: "typescript" },
  { id: "docs", label: "Documentation", description: "Give your code a voice.", icon: FileCode2, tone: "mint", lang: "python" },
];

export default function Dashboard({ setActiveTab, onStartWorkspace, history = [] }) {
  const [code, setCode] = useState("");
  const [tool, setTool] = useState("bugs");
  const [language, setLanguage] = useState("python");
  const start = (selected = tool, lang = language, source = code) => onStartWorkspace({
    code: source.trim() ? source : SAMPLE_CODES[lang] || SAMPLE_CODES.python, language: lang, tool: selected,
  });
  return <div className="dashboard-page">
    <div className="dashboard-welcome"><div><span className="eyebrow">LET'S MAKE SOMETHING GREAT</span><h1>Your coding playground<span className="title-dot">.</span></h1><p>A little AI. A big boost to your workflow.</p></div>
      <button className="button-dark" onClick={() => start("bugs", "python", "")}><Plus size={17} />New analysis</button></div>
    <div className="welcome-grid">
      <section className="hero-card">
        <img className="hero-art" src="/images/devmind-orbit.png" alt="Colorful pink and orange shapes orbiting a violet code core" />
        <div className="hero-copy"><span className="hero-kicker"><Zap size={14} /> YOUR IDEAS, SUPERCHARGED</span>
          <h2>Big ideas.<br />Better code.</h2><p>Explain it. Debug it. Make it yours.</p>
          <button className="hero-button" onClick={() => start("bugs", "python", "")}>Let's start coding <ArrowUpRight size={18} /></button>
        </div>
      </section>
      <section className="assistant-card"><span className="assistant-icon"><MessageSquare size={25} /></span><span className="eyebrow">MEET YOUR SIDEKICK</span><h2>Stuck on<br />something?</h2><p>Talk through a tricky bug or brainstorm your next move.</p><button onClick={() => setActiveTab("chat")}>Ask DevMind <ArrowUpRight size={18} /></button></section>
    </div>
    <div className="section-title"><h2>Pick your superpower</h2><span>One workspace. Four possibilities.</span></div>
    <div className="tool-grid">{tools.map((item) => <button className={`tool-card ${item.tone}`} key={item.id} onClick={() => start(item.id, item.lang, "")}>
      <div className="tool-card-top"><span className="tool-icon"><item.icon size={22} /></span><ArrowUpRight size={19} /></div>
      <h3>{item.label}</h3><p>{item.description}</p></button>)}</div>
    <div className="dashboard-bottom-grid">
      <section className="quick-start-panel">
        <div className="section-title"><div className="flex items-center gap-2"><Code2 size={20} /><h2>Start with a snippet</h2></div><button className="text-link" onClick={() => setCode(SAMPLE_CODES[language] || SAMPLE_CODES.python)}>Try a sample <ArrowUpRight size={15} /></button></div>
        <div className="snippet-editor"><div className="snippet-toolbar"><span className="code-lights"><i /><i /><i /></span><span>your-code.{language === "python" ? "py" : language === "java" ? "java" : language === "typescript" ? "ts" : "js"}</span></div>
          <textarea aria-label="Code to analyze" value={code} onChange={(event) => setCode(event.target.value)} placeholder="// Paste your code here…" maxLength={20000} rows={5} /></div>
        <div className="composer-controls"><div className="tool-pills">{tools.map((item) => <button key={item.id} aria-pressed={tool === item.id} onClick={() => setTool(item.id)} className={tool === item.id ? "selected" : ""}><item.icon size={14} />{item.id === "bugs" ? "Scan" : item.id === "explain" ? "Explain" : item.id === "refactor" ? "Refactor" : "Docs"}</button>)}</div>
          <div className="flex items-center gap-2"><select aria-label="Programming language" value={language} onChange={(event) => setLanguage(event.target.value)}><option value="python">Python</option><option value="javascript">JavaScript</option><option value="typescript">TypeScript</option><option value="java">Java</option></select><button className="button-dark button-small" onClick={() => start()}>Open workspace <ArrowRight size={16} /></button></div></div>
      </section>
      <section className="recent-panel"><div className="section-title"><div className="flex items-center gap-2"><History size={18} /><h2>Recent activity</h2></div><button className="text-link" onClick={() => setActiveTab("history")}>View all <ArrowUpRight size={15} /></button></div>
        {history.length ? <div className="dashboard-history">{history.slice(0, 3).map((item) => <button key={item.id} onClick={() => setActiveTab("history")}><span className="history-icon"><Code2 size={18} /></span><span><strong>{item.title}</strong><small>{item.language || "Code"} · {new Date(item.timestamp).toLocaleDateString()}</small></span><ArrowUpRight size={16} /></button>)}</div>
          : <div className="dashboard-empty"><span className="history-icon"><History size={26} /></span><strong>Your next win starts here</strong><p>Run your first analysis and we'll save it for you.</p><button className="text-link" onClick={() => start()}>Try your first analysis <ArrowRight size={15} /></button></div>}
        <div className="activity-footer"><span className="status-dot" />Progress, automatically saved.</div>
      </section>
    </div>
    <p className="dashboard-note">Sample mode provides illustrative responses. Review AI suggestions before applying them.</p>
  </div>;
}
