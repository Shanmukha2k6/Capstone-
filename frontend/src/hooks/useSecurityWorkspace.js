import { useEffect, useState } from "react";
import { useSecurityRecords } from "./useSecurityRecords";
import { createReview, decisionId, validateDecision } from "../utils/securityWorkspace";

async function connectProject(records, repository, tree, select) {
  const existing = records.current.current.projects.find((project) => project.fullName.toLowerCase() === repository.fullName.toLowerCase());
  if (!existing && records.current.current.projects.length >= 25) throw new Error("This workspace supports up to 25 repositories.");
  const project = { id: existing?.id || crypto.randomUUID(), owner: existing?.owner || repository.owner, repo: existing?.repo || repository.repo, fullName: existing?.fullName || repository.fullName,
    createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(), fileCount: tree.length,
    files: tree.slice(0, 1000).map(({ path, size }) => ({ path, size: size || 0 })) };
  await records.persist("projects", project); if (records.ownerRef.current === records.owner) select(project.id); return project;
}

async function retainReview(records, projectId, report) {
  const project = records.current.current.projects.find((item) => item.id === projectId);
  if (!project || report.repository.toLowerCase() !== project.fullName.toLowerCase()) throw new Error("The review does not match the selected project.");
  let review = records.reviewCache.current.get(report);
  if (review && records.current.current.reviews.some((item) => item.id === review.id)) return review;
  if (records.current.current.reviews.length >= 100) throw new Error("This workspace has reached its 100 saved-review limit. Export the new report from the scan page.");
  if (!review) { review = await createReview(projectId, report); records.reviewCache.current.set(report, review); }
  await records.persist("reviews", review); return review;
}

async function retainDecision(records, review, finding, status, note) {
  validateDecision(status, note);
  if (!records.current.current.reviews.some((item) => item.id === review.id && item.findingIds.includes(finding.id))) throw new Error("This finding is not part of a saved review.");
  const id = decisionId(review.id, finding.id);
  if (!records.current.current.decisions.some((item) => item.id === id) && records.current.current.decisions.length >= 1000) throw new Error("The workspace has reached its 1,000 decision limit.");
  await records.persist("decisions", { id, reviewId: review.id, findingId: finding.id, status, note: note.trim(), updatedAt: new Date().toISOString() });
}

export function useSecurityWorkspace() {
  const records = useSecurityRecords();
  const [selectedId, setSelectedId] = useState(null), [sourceFiles, setSourceFiles] = useState({});
  useEffect(() => { setSelectedId(null); setSourceFiles({}); }, [records.owner]);
  const activeProject = records.projects.find((project) => project.id === selectedId) || records.projects[0] || null;
  const rememberSource = (projectId, path, content) => {
    if (records.ownerRef.current !== records.owner || content.length > 20000) return;
    setSourceFiles((previous) => ({ ...previous, [projectId]: { ...Object.fromEntries(Object.entries(previous[projectId] || {}).filter(([name]) => name !== path).slice(-4)), [path]: content } }));
  };
  return { projects: records.projects, reviews: records.reviews, error: records.error, pending: records.pending,
    activeProject, selectProject: setSelectedId, connect: (repo, tree) => connectProject(records, repo, tree, setSelectedId),
    saveReview: (projectId, report) => retainReview(records, projectId, report), saveDecision: (review, finding, status, note) => retainDecision(records, review, finding, status, note), rememberSource,
    sourceFiles: activeProject ? sourceFiles[activeProject.id] || {} : {},
    decisions: Object.fromEntries(records.decisions.map((item) => [item.id, item])), cloud: Boolean(records.uid) };
}
