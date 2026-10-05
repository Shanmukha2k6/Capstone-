import React from "react";
import { PanelLeft, ArrowUpRight, LogOut, Home } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const names = { dashboard: "Overview", projects: "Projects", findings: "Findings inbox", workspace: "Snippet tools", repos: "Connect repository",
  quality: "Quality report", chat: "Project Q&A", history: "Snippet history", settings: "Settings" };

export default function Navbar({ onOpenAuth, onGoHome, sidebarOpen, setSidebarOpen, activeTab }) {
  const { user, logout } = useAuth();
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
      <div className="flex items-center gap-3">
        {user ? <><span className="user-avatar" title={user.displayName || user.email || "Account"}>
          {user.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : user.displayName?.[0] || user.email?.[0] || "D"}</span>
          <button className="icon-button" onClick={logout} aria-label="Sign Out"><LogOut size={17} /></button></>
          : <button className="button-dark button-small" onClick={onOpenAuth}>Sign in <ArrowUpRight size={15} /></button>}
      </div>
    </header>
  );
}
