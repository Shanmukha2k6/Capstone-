import React, { useState } from "react";
import { DECISIONS, sourceLink } from "../../utils/securityWorkspace";

export default function ReviewFinding({ review, finding, decision, onSave }) {
  const [status, setStatus] = useState(decision?.status || "open");
  const [note, setNote] = useState(decision?.note || "");
  const [saving, setSaving] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState(false);
  const persist = async () => {
    setSaving(true); setError(""); setSaved(false);
    try { await onSave(review, finding, status, note); setSaved(true); }
    catch (failure) { setError(failure.message || "Could not save the review decision."); }
    finally { setSaving(false); }
  };
  return <article className="saas-finding"><div className="saas-finding-heading"><div><span className="security-kicker">{review.report.repository}</span><h2>{finding.title}</h2></div><span className={`saas-severity severity-${finding.severity}`}>{finding.severity}</span></div>
    <a href={sourceLink(review.report, finding)} target="_blank" rel="noreferrer">{finding.file_path}:{finding.line_start}–{finding.line_end} · {review.report.revision.slice(0, 12)}</a>
    <p>{finding.explanation}</p><pre>{finding.evidence}</pre><p><strong>Recommended action:</strong> {finding.recommendation}</p>
    <div className="saas-decision"><label>Review status<select aria-label={`Review status for ${finding.title}`} value={status} disabled={saving} onChange={(event) => { setStatus(event.target.value); setSaved(false); }}>{Object.entries(DECISIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Reviewer note<textarea aria-label={`Reviewer note for ${finding.title}`} value={note} onChange={(event) => { setNote(event.target.value); setSaved(false); }} disabled={saving} maxLength={2000} rows={2} placeholder="Record what you inspected, verified, or accepted." /></label><button className="saas-secondary" onClick={persist} disabled={saving}>{saving ? "Saving…" : "Save decision"}</button>
    </div>{error && <p role="alert" className="saas-error">{error}</p>}{saved && <p role="status" className="saas-success">Decision saved.</p>}
    {decision?.updatedAt && <p className="saas-footnote">Last decision: {new Date(decision.updatedAt).toLocaleString()}. Reviewer disposition; remediation is not independently verified.</p>}
  </article>;
}
