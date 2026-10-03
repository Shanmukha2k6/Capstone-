import React, { useState } from "react";
import ReviewFinding from "../components/security/ReviewFinding";
import { DECISIONS, latestReviews, reviewFindings, decisionId } from "../utils/securityWorkspace";

export default function FindingsInbox({ workspace }) {
  const [status, setStatus] = useState("actionable"), [severity, setSeverity] = useState("all"), [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState(workspace.activeProject?.id || "all");
  const reviews = latestReviews(workspace.reviews).filter((review) => projectId === "all" || review.projectId === projectId);
  const entries = reviews.flatMap((review) => reviewFindings(review).map((finding) => ({ review, finding, decision: workspace.decisions[decisionId(review.id, finding.id)] })));
  const visible = entries.filter(({ finding, decision }) => {
    const currentStatus = decision?.status || "open";
    return (status === "all" || (status === "actionable" ? ["open", "in_progress"].includes(currentStatus) : status === currentStatus)) && (severity === "all" || finding.severity === severity) && `${finding.title} ${finding.file_path}`.toLowerCase().includes(query.toLowerCase());
  }).sort((a, b) => ["critical", "high", "medium", "low"].indexOf(a.finding.severity) - ["critical", "high", "medium", "low"].indexOf(b.finding.severity));
  return <div className="findings-inbox"><div className="security-page-title"><div><p className="security-kicker">FINDINGS INBOX</p><h1>Review the evidence</h1><p>Latest saved review per repository. Prioritize, inspect, and record your decision.</p></div></div>
    <div className="saas-filters"><select aria-label="Filter repository" value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="all">All repositories</option>{workspace.projects.map((project) => <option key={project.id} value={project.id}>{project.fullName}</option>)}</select>
      <select aria-label="Filter finding status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="actionable">Needs review</option><option value="all">All statuses</option>{Object.entries(DECISIONS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
      <select aria-label="Filter severity" value={severity} onChange={(event) => setSeverity(event.target.value)}><option value="all">All severities</option>{["critical", "high", "medium", "low"].map((value) => <option key={value} value={value}>{value}</option>)}</select><input aria-label="Search findings" placeholder="Search title or file…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
    <p className="saas-muted">{visible.length} of {entries.length} findings shown · Resolving a finding or accepting risk requires a review note.</p>
    {visible.map(({ review, finding, decision }) => <ReviewFinding key={`${review.id}_${finding.id}`} review={review} finding={finding} decision={decision} onSave={workspace.saveDecision} />)}
    {!visible.length && <div className="saas-panel saas-empty"><h2>{entries.length ? "No findings match these filters" : "No findings to display"}</h2><p>{reviews.length ? "Check review history for the scope and outcome. An empty queue does not certify a repository safe." : "Run and save a Gemini source review in a project to populate this inbox."}</p></div>}
  </div>;
}
