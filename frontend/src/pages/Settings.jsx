import React, { useState } from "react";
import { Database, KeyRound, Moon, Palette, UserRound } from "lucide-react";
import AccountSettings from "../components/settings/AccountSettings";
import GeminiKeySettings from "../components/settings/GeminiKeySettings";
import DataSettings from "../components/settings/DataSettings";
import "../settings.css";

const TABS = [
  ["account", "Account", UserRound], ["ai", "AI provider", KeyRound],
  ["data", "Workspace data", Database], ["appearance", "Appearance", Palette],
];

function AppearanceSettings() {
  return <section className="settings-card appearance-card"><div className="settings-icon"><Moon size={22} /></div>
    <div><h2>Theme</h2><p>The dark theme is active across your workspace.</p></div><span className="settings-badge">Dark theme</span></section>;
}

export default function Settings({ onOpenRepositories, onOpenProjects, security, historyState, initialTab = "account" }) {
  const [tab, setTab] = useState(initialTab);
  return <div className="settings-layout">
    <nav className="settings-tabs" aria-label="Settings sections">
      {TABS.map(([id, label, Icon]) => <button key={id} className={tab === id ? "active" : ""} aria-current={tab === id ? "page" : undefined}
        onClick={() => setTab(id)}><Icon size={17} />{label}</button>)}
    </nav>
    <div className="settings-page">
      {tab === "account" && <AccountSettings />}
      {tab === "ai" && <GeminiKeySettings onOpenRepositories={onOpenRepositories} />}
      {tab === "data" && <DataSettings security={security} historyState={historyState} onOpenProjects={onOpenProjects} />}
      {tab === "appearance" && <AppearanceSettings />}
    </div>
  </div>;
}
