import React from "react";
import { compareReviews, downloadReview } from "../../utils/securityWorkspace";

export default function ReviewHistory({ reviews, decisions, onOpenFindings }) {
  if (!reviews.length) return <section className="saas-panel saas-empty"><h2>No saved reviews</h2><p>Completed Gemini source reviews will appear here with their commit revision, coverage, and evidence.</p></section>;
  return <section className="saas-panel"><div className="saas-section-title"><h2>Review history</h2><span>Human decisions are stored separately from source evidence.</span></div>{reviews.map((review, index) => {
    const diff = compareReviews(review, reviews[index + 1]);
    return <article className="saas-saved-review" key={review.id}><div className="saas-review-row"><span><strong>{new Date(review.createdAt).toLocaleString()}</strong><small>{review.report.revision.slice(0, 12)} · {review.report.model}</small></span><span>{review.report.findings.length} indicators · {review.report.analyzed_files.length}/{review.report.eligible_files} files</span><button className="saas-secondary" onClick={() => downloadReview(review, decisions, reviews[index + 1])}>Export report</button></div><p>{review.report.summary}</p>
      {diff && <div className="saas-comparison"><span>{diff.added} new</span><span>{diff.repeated} repeated</span><span>{diff.notObserved} not observed in covered files</span><span>{diff.outsideCoverage} outside current coverage</span></div>}
      {diff && <p className="saas-footnote">Evidence fingerprints compare exact snippets. AI output may vary. An absent indicator is not a verified fix.</p>}
      {index === 0 && <button className="saas-text-button" onClick={onOpenFindings}>Review latest findings</button>}
    </article>;
  })}</section>;
}
