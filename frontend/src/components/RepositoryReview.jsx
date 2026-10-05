import React, { useState } from "react";
import { AlertCircle, Bug, CheckCircle2, Gauge, RotateCw, ScanSearch, ShieldAlert, Sparkles, Wrench } from "lucide-react";
import { api } from "../api/client";

const SEVERITY_STYLES = {
  critical: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  high: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  medium: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  low: "bg-sky-500/15 text-sky-300 border-sky-500/30",
};
const CATEGORY_ICONS = { bug: Bug, security: ShieldAlert, performance: Gauge, maintainability: Wrench, style: Sparkles };
const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function ScoreBadge({ score }) {
  if (score === null) return null;
  const tone = score >= 80 ? "text-emerald-300" : score >= 60 ? "text-amber-300" : "text-rose-300";
  const grade = score >= 80 ? "Healthy" : score >= 60 ? "Needs attention" : "At risk";
  return <div className="rounded-xl border border-gpt-border bg-gpt-surface/60 p-4 flex items-center gap-4">
    <div className={`text-4xl font-bold font-mono ${tone}`}>{score}<span className="text-sm text-gpt-muted">/100</span></div>
    <div><p className="text-sm font-semibold text-gpt-text">Repository health</p><p className="text-xs text-gpt-muted">{grade}</p></div>
  </div>;
}

function FindingRow({ finding }) {
  const Icon = CATEGORY_ICONS[finding.category] || Wrench;
  return <article className="rounded-xl border border-gpt-border bg-gpt-surface/60 p-4 space-y-2">
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-violet-300"><Icon size={15} /></span>
      <h4 className="font-semibold text-gpt-text flex-1 min-w-0">{finding.title}</h4>
      <span className={`text-xs px-2 py-0.5 rounded-full border ${SEVERITY_STYLES[finding.severity]}`}>{finding.severity}</span>
    </div>
    <p className="text-xs text-gpt-muted font-mono">{finding.file_path}:{finding.line_start}{finding.line_end !== finding.line_start ? `-${finding.line_end}` : ""} · {finding.category}</p>
    <pre className="text-xs bg-gpt-bg border border-gpt-border rounded-lg p-2.5 overflow-x-auto text-gpt-subtext"><code>{finding.evidence}</code></pre>
    <p className="text-sm text-gpt-subtext">{finding.explanation}</p>
    <p className="text-sm text-gpt-subtext"><span className="font-semibold text-gpt-text">Fix: </span>{finding.recommendation}</p>
  </article>;
}

export default function RepositoryReview({ repository, token, onOpenSettings }) {
  const [state, setState] = useState({ loading: false, error: "", report: null });
  const run = async () => {
    setState({ loading: true, error: "", report: null });
    try { setState({ loading: false, error: "", report: await api.reviewRepository(repository.owner, repository.repo, token) }); }
    catch (err) { setState({ loading: false, error: err.message || "Could not complete the repository review.", report: null }); }
  };
  const report = state.report;
  const findings = report ? [...report.findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]) : [];
  const needsKey = state.error.includes("API key");
  return <section className="flex-1 min-h-0 overflow-y-auto bg-gpt-surface border border-gpt-border rounded-2xl p-5 space-y-5" aria-label="Repository code review">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="max-w-xl"><div className="flex items-center gap-2 text-violet-300"><ScanSearch size={22} /><h2 className="font-semibold">AI repository code review</h2></div>
        <p className="text-sm text-gpt-subtext mt-2">Reviews the key source files of <strong>{repository.fullName}</strong> for bugs, security issues, performance, and maintainability.</p>
        <p className="text-xs text-gpt-muted mt-2">Source files are sent to Gemini and never executed. Each finding cites exact file and line evidence. AI output needs human review.</p></div>
      <button className="button-dark" onClick={run} disabled={state.loading}>{state.loading ? <RotateCw size={16} className="animate-spin" /> : <ScanSearch size={16} />}{state.loading ? "Reviewing…" : report ? "Re-run review" : "Review repository"}</button>
    </div>
    {state.loading && <p role="status" className="text-sm text-violet-300">Fetching key source files and reviewing them with Gemini. This may take a minute.</p>}
    {state.error && <div role="alert" className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-4 text-sm text-rose-300 flex flex-wrap items-center gap-2"><AlertCircle size={18} className="shrink-0" />{state.error}{needsKey && onOpenSettings && <button className="text-link" onClick={onOpenSettings}>Open Settings</button>}</div>}
    {report && <>
      <div className="grid gap-3 sm:grid-cols-2"><ScoreBadge score={report.score} />
        <div className="rounded-xl border border-gpt-border bg-gpt-surface/60 p-4"><p className="text-sm font-semibold text-gpt-text">Coverage</p><p className="text-xs text-gpt-muted mt-1">{report.analyzed_files.length} key files reviewed of {report.file_count} · {report.findings.length} findings · {report.model}</p></div></div>
      <p className="text-sm text-gpt-subtext">{report.summary}</p>
      {report.strengths.length > 0 && <div className="rounded-xl border border-gpt-border bg-gpt-surface/60 p-4 space-y-2"><p className="text-sm font-semibold text-gpt-text">Strengths</p>
        <ul className="space-y-1.5">{report.strengths.map((s, i) => <li key={i} className="flex items-start gap-2 text-sm text-gpt-subtext"><CheckCircle2 size={15} className="text-emerald-300 shrink-0 mt-0.5" />{s}</li>)}</ul></div>}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gpt-subtext uppercase tracking-wide">Findings ({findings.length})</p>
        {findings.length ? findings.map((f, i) => <FindingRow key={i} finding={f} />)
          : <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-center gap-2"><CheckCircle2 size={16} />No issues were identified in the reviewed files. This does not certify the repository as defect-free.</div>}
      </div>
    </>}
  </section>;
}
