import React from "react";
import { PanelLeft, Home } from "lucide-react";

const names = { dashboard: "Overview", projects: "Projects", workspace: "Snippet tools", repos: "Connect repository",
  quality: "Quality report", chat: "Project Q&A", history: "Snippet history", settings: "Settings" };

export default function Navbar({ onGoHome, sidebarOpen, setSidebarOpen, activeTab }) {
  return (
    <header className="app-topbar">
      <div className="flex items-center gap-3 min-w-0">
        <button className="icon-button" onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}><PanelLeft size={19} /></button>
        <button className="topbar-crumb hidden sm:inline-flex" onClick={onGoHome} aria-label="Back to DevMind home"><Home size={14} />Home</button>
        <span className="hidden sm:inline text-slate-300">/</span>
        <span className="hidden sm:inline text-gpt-muted text-sm">Workspace</span>
        <span className="hidden sm:inline text-slate-300">/</span>
        <span className="text-sm font-semibold text-gpt-text truncate">{names[activeTab]}</span>
      </div>
    </header>
  );
}
