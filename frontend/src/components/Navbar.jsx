import React, { useEffect, useState } from "react";
import { PanelLeft, ArrowUpRight, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

const names = { dashboard: "Overview", projects: "Projects", findings: "Findings inbox", workspace: "Snippet tools", repos: "Connect repository",
  quality: "Quality report", chat: "Project Q&A", history: "Snippet history", settings: "Settings" };

export default function Navbar({ onOpenAuth, sidebarOpen, setSidebarOpen, activeTab }) {
  const { user, logout } = useAuth();
  const [health, setHealth] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const check = ["dashboard", "projects", "findings", "repos"].includes(activeTab)
      ? api.getMalwareScanConfig().then((config) => ({ ...config, status: config.configured ? "healthy" : "needs_setup" }))
      : activeTab === "chat" ? api.getChatConfig().then((config) => ({ status: "healthy", ...config })) : api.checkHealth();
    check.then((value) => { if (!cancelled) setHealth(value); }).catch(() => { if (!cancelled) setHealth({ status: "offline" }); });
    return () => { cancelled = true; };
  }, [activeTab]);
  return (
    <header className="app-topbar">
      <div className="flex items-center gap-3 min-w-0">
        <button className="icon-button" onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}><PanelLeft size={19} /></button>
        <span className="hidden sm:inline text-gpt-muted text-sm">Workspace</span>
        <span className="hidden sm:inline text-slate-300">/</span>
        <span className="text-sm font-semibold text-gpt-text truncate">{names[activeTab]}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="engine-badge hidden sm:flex"><span className={health?.status === "healthy" ? "status-dot" : "status-dot offline"} />
          {health?.status === "needs_setup" ? "Gemini key required" : health?.provider === "mock" ? "Demo tools" : health?.status === "offline" ? "API offline" : health?.provider === "gemini" ? "Gemini configured" : health?.provider || "Connecting"}
        </span>
        {user ? <><span className="user-avatar" title={user.displayName || user.email || "Guest"}>{user.displayName?.[0] || user.email?.[0] || "D"}</span>
          <button className="icon-button" onClick={logout} aria-label="Sign Out"><LogOut size={17} /></button></>
          : <button className="button-dark button-small" onClick={onOpenAuth}>Sign In <ArrowUpRight size={15} /></button>}
      </div>
    </header>
  );
}
