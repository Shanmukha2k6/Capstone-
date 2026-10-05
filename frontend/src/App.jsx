import React, { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import WorkspaceContent from "./components/WorkspaceContent";
import AuthModal from "./pages/AuthModal";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useAnalysisHistory } from "./hooks/useAnalysisHistory";
import { useSecurityWorkspace } from "./hooks/useSecurityWorkspace";
import "./security.css";

export default function App() { return <AuthProvider><SessionShell /></AuthProvider>; }
function SessionShell() {
  const { user } = useAuth();
  return <AppShell key={user?.uid || "signed-out"} />;
}
function AppShell() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { authError } = useAuth();
  useEffect(() => { if (authError) setIsAuthOpen(true); }, [authError]);
  const historyState = useAnalysisHistory(), security = useSecurityWorkspace();
  const [workspacePreload, setWorkspacePreload] = useState(null);
  const openWorkspace = ({ code, language, tool = "bugs", data = null }) => {
    setWorkspacePreload({ code, language, tool, data, id: crypto.randomUUID() });
    setActiveTab("workspace");
  };
  const openSaved = (item) => openWorkspace({ code: item.code || item.codeSnippet, language: item.language || "python", tool: item.type, data: item.data });
  const openProject = (id) => { security.selectProject(id); setActiveTab("projects"); };
  const connectRepository = async (repository, tree) => { await security.connect(repository, tree); setActiveTab("projects"); };
  return <div className="devmind-shell">
    <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} activeTab={activeTab} setActiveTab={setActiveTab}
      history={historyState.history} projects={security.projects} activeProject={security.activeProject} onSelectProject={openProject} />
    <div className="app-main-column">
      <Navbar onOpenAuth={() => setIsAuthOpen(true)} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} activeTab={activeTab} />
      <WorkspaceContent activeTab={activeTab} security={security} historyState={historyState} workspacePreload={workspacePreload}
        openWorkspace={openWorkspace} openSaved={openSaved} setActiveTab={setActiveTab} openProject={openProject} connectRepository={connectRepository} />
    </div>
    <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
  </div>;
}
