import React, { useEffect, useState } from "react";
import PageHeading from "./PageHeading";
import SecurityOverview from "../pages/SecurityOverview";
import ProjectWorkspace from "../pages/ProjectWorkspace";
import FindingsInbox from "../pages/FindingsInbox";
import CodeWorkspace from "../pages/CodeWorkspace";
import RepoExplorer from "../pages/RepoExplorer";
import QualityReport from "../pages/QualityReport";
import ChatAssistant from "../pages/ChatAssistant";
import HistoryView from "../pages/HistoryView";
import Settings from "../pages/Settings";

function WorkspacePages({ activeTab, security, historyState, workspacePreload, openWorkspace, openSaved, setActiveTab, connectRepository, settingsTab, openSettings }) {
  const openConnect = () => setActiveTab("repos"), openFindings = () => setActiveTab("findings");
  return <div className={`tool-page tool-${activeTab}`}>
    {activeTab === "workspace" && <CodeWorkspace key={workspacePreload?.id} onSaveAnalysis={historyState.save} preloadData={workspacePreload} />}
    {activeTab === "repos" && <RepoExplorer onConnectedRepository={connectRepository} onOpenInWorkspace={openWorkspace} onOpenSettings={openSettings} />}
    {activeTab === "projects" && <ProjectWorkspace workspace={security} onConnect={openConnect} onOpenSettings={openSettings} onOpenInWorkspace={openWorkspace} onOpenFindings={openFindings} onOpenChat={() => setActiveTab("chat")} />}
    {activeTab === "findings" && <FindingsInbox workspace={security} />}
    {activeTab === "quality" && <QualityReport />}
    {activeTab === "chat" && <ChatAssistant key={security.activeProject?.id || "general"} project={security.activeProject} sourceFiles={security.sourceFiles} onOpenProject={() => setActiveTab("projects")} onOpenSettings={openSettings} />}
    {activeTab === "history" && <HistoryView history={historyState.history} onClearHistory={historyState.clear} onOpenWorkspaceWithSnippet={openSaved} />}
    {activeTab === "settings" && <Settings onOpenRepositories={openConnect} onOpenProjects={() => setActiveTab("projects")} security={security} historyState={historyState} initialTab={settingsTab} />}
  </div>;
}

export default function WorkspaceContent(props) {
  const { activeTab, security, historyState, setActiveTab, openProject } = props;
  const [settingsTab, setSettingsTab] = useState("account");
  useEffect(() => { if (activeTab !== "settings") setSettingsTab("account"); }, [activeTab]);
  const openSettings = () => { setSettingsTab("ai"); setActiveTab("settings"); };
  const isSecurity = ["dashboard", "projects", "findings", "repos"].includes(activeTab);
  const label = isSecurity ? security.cloud ? "Account security workspace" : "Local security workspace · saved on this device" : historyState.storageLabel;
  return <main key={activeTab} className={`app-content ${activeTab === "chat" ? "chat-main-content" : ""}`}>
    <div className="storage-status" role="status"><span className="status-dot" />{label}{(isSecurity ? security.pending : historyState.pending) ? " · loading…" : ""}
      {!isSecurity && historyState.error && <span className="text-rose-300">{historyState.error}</span>}</div>
    {security.error && <p role="alert" className="saas-error">{security.error}</p>}
    {security.pending && <p role="status" className="saas-muted">Loading the security workspace…</p>}
    {!["dashboard", "chat", "projects", "findings"].includes(activeTab) && <PageHeading page={activeTab} />}
    {activeTab === "dashboard" ? <SecurityOverview workspace={security} onConnect={() => setActiveTab("repos")} onOpenProject={openProject} onOpenFindings={() => setActiveTab("findings")} /> : <WorkspacePages {...props} settingsTab={settingsTab} openSettings={openSettings} />}
  </main>;
}
