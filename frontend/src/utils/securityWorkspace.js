export const DECISIONS = { open: "Open", in_progress: "In review", resolved: "Resolved by reviewer", accepted_risk: "Risk accepted" };
export const latestReviews = (reviews) => Object.values(reviews.reduce((result, review) => {
  if (!result[review.projectId] || result[review.projectId].createdAt < review.createdAt) result[review.projectId] = review;
  return result;
}, {}));
export const reviewFindings = (review) => review.report.findings.map((finding, index) => ({ ...finding, id: review.findingIds[index] }));
export const decisionId = (reviewId, findingId) => `${reviewId}_${findingId}`;
export const sourceLink = (report, finding) => `https://github.com/${report.repository}/blob/${report.revision}/${finding.file_path.split("/").map(encodeURIComponent).join("/")}#L${finding.line_start}-L${finding.line_end}`;

export async function evidenceId(finding) {
  const data = new TextEncoder().encode(JSON.stringify([finding.file_path, finding.category, finding.evidence.trim()]));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createReview(projectId, report) {
  if (report.provider !== "gemini" || !report.revision || !Array.isArray(report.findings)) throw new Error("Only completed Gemini source reviews can be saved.");
  const review = { id: crypto.randomUUID(), projectId, createdAt: new Date().toISOString(), report,
    findingIds: await Promise.all(report.findings.map(evidenceId)) };
  if (new TextEncoder().encode(JSON.stringify(review)).length > 700000) throw new Error("This report exceeds the saved-review limit. Export it from the scan page instead.");
  return review;
}

export function compareReviews(current, previous) {
  if (!previous) return null;
  const currentIds = new Set(current.findingIds), previousIds = new Set(previous.findingIds);
  const covered = new Set(current.report.analyzed_files);
  const absent = reviewFindings(previous).filter((finding) => !currentIds.has(finding.id));
  return { added: current.findingIds.filter((id) => !previousIds.has(id)).length,
    repeated: current.findingIds.filter((id) => previousIds.has(id)).length,
    notObserved: absent.filter((finding) => covered.has(finding.file_path)).length,
    outsideCoverage: absent.filter((finding) => !covered.has(finding.file_path)).length };
}

export function validateDecision(status, note) {
  if (!DECISIONS[status]) throw new Error("Choose a valid review status.");
  if (note.length > 2000) throw new Error("Keep the review note within 2,000 characters.");
  if (["resolved", "accepted_risk"].includes(status) && !note.trim()) throw new Error("Add a note explaining the fix verification or accepted risk.");
}

export function workspaceMetrics(projects, reviews, decisions) {
  const latest = latestReviews(reviews);
  const findings = latest.flatMap((review) => reviewFindings(review).map((finding) => ({ ...finding, status: decisions[decisionId(review.id, finding.id)]?.status || "open" })));
  const actionable = findings.filter((finding) => ["open", "in_progress"].includes(finding.status));
  return { projects: projects.length, reviews: reviews.length, open: actionable.length,
    high: actionable.filter((finding) => ["critical", "high"].includes(finding.severity)).length };
}

const safe = (value) => String(value ?? "").replaceAll("`", "'");
export function reviewMarkdown(review, decisions, previous = null) {
  const report = review.report, comparison = compareReviews(review, previous);
  const lines = [`# Security review: ${safe(report.repository)}`, "", `Reviewed: ${review.createdAt}`, `Revision: ${report.revision}`, `Provider: ${report.provider} / ${safe(report.model)}`, `Outcome: ${report.verdict}`, "", report.summary, "", "## Coverage", "",
    `${report.analyzed_files.length} of ${report.eligible_files} eligible files reviewed; ${report.skipped_count} skipped. ${report.unverified_findings || 0} unsupported model findings excluded.`, "", ...report.analyzed_files.map((path) => `- ${safe(path)}`)];
  if (comparison) lines.push("", "## Compared with previous review", "", `${comparison.added} new evidence indicators; ${comparison.repeated} repeated; ${comparison.notObserved} not observed in reviewed files; ${comparison.outsideCoverage} outside current coverage.`, "Absence of an indicator is not proof of a fix. AI output can vary between reviews.");
  lines.push("", "## Findings", "");
  reviewFindings(review).forEach((finding) => {
    const decision = decisions[decisionId(review.id, finding.id)] || { status: "open", note: "" };
    lines.push(`### ${safe(finding.title)}`, "", `Severity: ${finding.severity}; status: ${DECISIONS[decision.status]}`, `[${safe(finding.file_path)}:${finding.line_start}–${finding.line_end}](${sourceLink(report, finding)})`, "", finding.explanation, "", "Evidence:", "", ...finding.evidence.split("\n").map((line) => `    ${line}`), "", `Recommended action: ${finding.recommendation}`, `Reviewer note: ${decision.note || "None"}`, "");
  });
  if (!report.findings.length) lines.push("No supported indicators in the reviewed files. This does not certify the repository safe.");
  return [...lines, "", "## Limitations", "", ...report.limitations.map((item) => `- ${item}`), "", "Reviewer decisions are not independently verified remediation.", "", "## Skipped files (returned subset)", "", ...report.skipped_files.map((item) => `- ${safe(item.path)}: ${item.reason}`)].join("\n");
}

export function downloadReview(review, decisions, previous) {
  const url = URL.createObjectURL(new Blob([reviewMarkdown(review, decisions, previous)], { type: "text/markdown;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url;
  anchor.download = `${review.report.repository.replaceAll("/", "-")}-${review.report.revision.slice(0, 12)}-review.md`;
  anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadScan(report) {
  const review = { id: "unsaved", createdAt: new Date().toISOString(), report, findingIds: await Promise.all(report.findings.map(evidenceId)) };
  downloadReview(review, {});
}
