import React from "react";
import { LayoutDashboard, Code2, FolderGit2, ShieldCheck, MessageSquare, History, Command, Settings, Plus, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ sidebarOpen, setSidebarOpen, activeTab, setActiveTab, history = [], onSelectHistory, projects = [], activeProject, onSelectProject }) {
  const { user } = useAuth();
  if (!sidebarOpen) return null;
  const select = (id) => { setActiveTab(id); if (window.innerWidth < 768) setSidebarOpen(false); };
  const navigation = [
    ["dashboard", "Overview", LayoutDashboard], ["projects", "Projects", FolderGit2],
    ["findings", "Findings inbox", ShieldCheck], ["repos", "Connect repository", Plus],
    ["chat", "Project Q&A", MessageSquare], ["workspace", "Snippet tools", Code2], ["history", "Snippet history", History],
    ["settings", "Settings", Settings],
  ];
  return <>
    <button className="sidebar-scrim md:hidden" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />
    <aside className="app-sidebar">
      <button className="sidebar-brand" onClick={() => select("dashboard")} aria-label="DevMind overview">
        <span className="brand-mark"><Command size={22} /></span><span>devmind<span className="brand-ai">AI</span></span>
      </button>
      <div className="workspace-label"><span className="workspace-avatar">D</span><div><strong>Security workspace</strong><span>{user && !user.isGuest ? "Account workspace" : "Saved on this device"}</span></div></div>
      <p className="nav-caption">WORKSPACE</p>
      <nav aria-label="Main navigation" className="space-y-1">
        {navigation.map(([id, label, Icon]) => <button key={id} onClick={() => select(id)}
          className={`nav-link ${activeTab === id ? "active" : ""}`} aria-current={activeTab === id ? "page" : undefined}>
          <Icon size={18} /><span>{label}</span>{id === "chat" && <span className="nav-ai">AI</span>}
          {id === "history" && history.length > 0 && <span className="nav-count">{history.length}</span>}
        </button>)}
      </nav>
      <div className="sidebar-recents"><p className="nav-caption">REPOSITORIES</p>
        {projects.length ? projects.slice(0, 5).map((item) => <button className="recent-link" key={item.id} aria-current={activeProject?.id === item.id ? "true" : undefined}
          onClick={() => { onSelectProject?.(item.id); if (window.innerWidth < 768) setSidebarOpen(false); }}>
          <span className="recent-dot" /><span>{item.fullName}</span></button>)
          : <p className="sidebar-empty">Connect a repository to start a review.</p>}
      </div>
      <div className="sidebar-bottom">
        <div className="plan-card"><div className="plan-card-head"><Sparkles size={15} /><strong>Free beta</strong></div>
          <p>All current features are free while DevMind is in beta.</p></div>
        <div className="sidebar-profile"><span className="workspace-avatar">{user?.displayName?.[0] || user?.email?.[0] || "D"}</span>
          <div><strong>{user?.displayName || user?.email?.split("@")[0] || "Local developer"}</strong><span>{user && !user.isGuest ? "Account workspace" : "Local workspace"}</span></div>
          <span className="status-dot" /></div>
      </div>
    </aside>
  </>;
}
