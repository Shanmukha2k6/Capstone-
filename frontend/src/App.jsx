import React, { useCallback, useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import WorkspaceContent from "./components/WorkspaceContent";
import SignInPage from "./pages/SignInPage";
import LandingPage from "./pages/LandingPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useAnalysisHistory } from "./hooks/useAnalysisHistory";
import { useSecurityWorkspace } from "./hooks/useSecurityWorkspace";
import { useHashRoute } from "./hooks/useHashRoute";
import "./security.css";

export default function App() { return <AuthProvider><Router /></AuthProvider>; }
function Router() {
  const [route, navigate] = useHashRoute();
  const { user, loading, authError } = useAuth();
  const goApp = useCallback(() => navigate("app"), [navigate]);
  const goHome = useCallback(() => navigate("home"), [navigate]);
  const goLogin = useCallback(() => navigate("login"), [navigate]);
  const needsLogin = route === "app" && !loading && !user;
  useEffect(() => { if (authError || needsLogin) goLogin(); }, [authError, needsLogin, goLogin]);
  if (route === "login") return <SignInPage onBack={goHome} onSignedIn={goApp} />;
  if (route === "home") return <LandingPage onOpenApp={user ? goApp : goLogin} onSignIn={goLogin} />;
  if (!user) return <div className="auth-loading" role="status">Checking your session…</div>;
  return <AppShell key={user?.uid || "signed-out"} onGoHome={goHome} />;
}
function AppShell({ onGoHome }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
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
      history={historyState.history} />
    <div className="app-main-column">
      <Navbar onGoHome={onGoHome} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} activeTab={activeTab} />
      <WorkspaceContent activeTab={activeTab} security={security} historyState={historyState} workspacePreload={workspacePreload}
        openWorkspace={openWorkspace} openSaved={openSaved} setActiveTab={setActiveTab} openProject={openProject} connectRepository={connectRepository} />
    </div>
  </div>;
}
