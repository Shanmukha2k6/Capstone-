import React from "react";
import { LayoutDashboard, Code2, FolderGit2, Gauge, MessageSquare, History, Command, Settings, Plus, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAVIGATION = [
  ["dashboard", "Overview", LayoutDashboard], ["projects", "Projects", FolderGit2],
  ["repos", "Connect repository", Plus],
  ["chat", "Project Q&A", MessageSquare], ["workspace", "Snippet tools", Code2],
  ["quality", "Quality report", Gauge], ["history", "Snippet history", History],
  ["settings", "Settings", Settings],
];

export default function Sidebar({ sidebarOpen, setSidebarOpen, activeTab, setActiveTab, history = [] }) {
  const { user, logout } = useAuth();
  if (!sidebarOpen) return null;
  const select = (id) => { setActiveTab(id); if (window.innerWidth < 768) setSidebarOpen(false); };
  const name = user?.displayName || user?.email?.split("@")[0] || "Account";
  return <>
    <button className="sidebar-scrim md:hidden" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />
    <aside className="app-sidebar">
      <button className="sidebar-brand" onClick={() => select("dashboard")} aria-label="DevMind overview">
        <span className="brand-mark"><Command size={22} /></span><span>devmind<span className="brand-ai">AI</span></span>
      </button>
      <nav aria-label="Main navigation" className="sidebar-nav">
        {NAVIGATION.map(([id, label, Icon]) => <button key={id} onClick={() => select(id)}
          className={`nav-link ${activeTab === id ? "active" : ""}`} aria-current={activeTab === id ? "page" : undefined}>
          <Icon size={18} /><span>{label}</span>{id === "chat" && <span className="nav-ai">AI</span>}
          {id === "history" && history.length > 0 && <span className="nav-count">{history.length}</span>}
        </button>)}
      </nav>
      <div className="sidebar-profile">
        <span className="workspace-avatar">{user?.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : name[0]}</span>
        <div><strong>{name}</strong>{user?.email && <span>{user.email}</span>}</div>
        <button className="icon-button" onClick={logout} aria-label="Sign out" title="Sign out"><LogOut size={16} /></button>
      </div>
    </aside>
  </>;
}
