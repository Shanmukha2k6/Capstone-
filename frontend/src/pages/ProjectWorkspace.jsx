import React, { useState } from "react";
import RepoExplorer from "./RepoExplorer";
import RepositoryMalwareScan from "../components/RepositoryMalwareScan";
import RepositoryInsights from "../components/RepositoryInsights";
import RepositoryReview from "../components/RepositoryReview";
import ReviewHistory from "../components/security/ReviewHistory";
import { FolderGit2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function ProjectWorkspace({ workspace, onConnect, onOpenSettings, onOpenInWorkspace, onOpenChat }) {
  const [view, setView] = useState("review");
  const { githubToken } = useAuth();
  const project = workspace.activeProject;
  if (!project) return <div className="saas-panel saas-empty"><span className="saas-empty-icon"><FolderGit2 size={24} /></span><h2>No repository selected</h2><p>Connect a repository to create a persistent review workspace.</p><button className="saas-primary" onClick={onConnect}>Connect repository</button></div>;
  const reviews = workspace.reviews.filter((review) => review.projectId === project.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <div className="project-workspace">
    <div className="security-page-title"><div><p className="security-kicker">PROJECT WORKSPACE</p><h1>{project.fullName}</h1><p>{project.fileCount.toLocaleString()} text files discovered · {reviews.length} saved reviews</p></div><select aria-label="Active repository" value={project.id} onChange={(event) => workspace.selectProject(event.target.value)}>{workspace.projects.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select></div>
    <div className="saas-project-tabs">{[["review", "Source review"], ["codereview", "Code review"], ["insights", "Insights & README"], ["files", "Repository files"], ["history", "Review history"]].map(([id, label]) => <button key={id} aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>)}<button onClick={onOpenChat}>Ask about this project</button></div>
    {view === "review" && <RepositoryMalwareScan key={project.id} repository={project} token={githubToken} onOpenSettings={onOpenSettings} onReport={(report) => workspace.saveReview(project.id, report)} />}
    {view === "codereview" && <RepositoryReview key={project.id} repository={project} token={githubToken} onOpenSettings={onOpenSettings} />}
    {view === "insights" && <RepositoryInsights key={project.id} repository={project} token={githubToken} />}
    {view === "files" && <RepoExplorer key={project.id} project={project} onConnectedRepository={workspace.connect} onOpenInWorkspace={onOpenInWorkspace} onOpenSettings={onOpenSettings} onSourceLoaded={(path, content) => workspace.rememberSource(project.id, path, content)} onReport={(report) => workspace.saveReview(project.id, report)} />}
    {view === "history" && <ReviewHistory reviews={reviews} decisions={workspace.decisions} />}
  </div>;
}
