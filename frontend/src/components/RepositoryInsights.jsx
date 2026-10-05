import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { AlertCircle, BarChart3, Check, Copy, Download, Eye, FileText, GitFork, RotateCw, Star, CircleDot } from "lucide-react";
import { api } from "../api/client";
import { repoSnapshot } from "../api/repoContext";

const LANGUAGE_COLORS = ["bg-violet-400", "bg-sky-400", "bg-emerald-400", "bg-amber-400", "bg-rose-400", "bg-slate-400"];

function StatTile({ icon: Icon, label, value }) {
  return <div className="rounded-xl border border-gpt-border bg-gpt-surface/60 p-4">
    <div className="flex items-center gap-2 text-xs text-gpt-subtext"><Icon size={14} />{label}</div>
    <p className="mt-2 text-2xl font-semibold text-gpt-text">{Number(value || 0).toLocaleString()}</p>
  </div>;
}

function LanguageBreakdown({ languages }) {
  if (!languages?.length) return <p className="text-sm text-gpt-muted">GitHub reports no language data for this repository.</p>;
  const top = [...languages].sort((a, b) => b.percentage - a.percentage).slice(0, 6);
  return <div className="space-y-3">
    <div className="flex h-2.5 overflow-hidden rounded-full bg-gpt-border" aria-hidden="true">
      {top.map((lang, i) => <span key={lang.name} className={LANGUAGE_COLORS[i]} style={{ width: `${lang.percentage}%` }} />)}
    </div>
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
      {top.map((lang, i) => <li key={lang.name} className="flex items-center gap-2 text-gpt-subtext"><span className={`h-2.5 w-2.5 rounded-full ${LANGUAGE_COLORS[i]}`} />{lang.name}<span className="text-gpt-muted">{lang.percentage}%</span></li>)}
    </ul>
  </div>;
}

async function readmeFromRepository(repository, stats) {
  const snapshot = await repoSnapshot(repository.owner, repository.repo);
  if (snapshot.fetch_error) throw new Error(snapshot.fetch_error);
  const samples = snapshot.key_files.map((file) => `// ${file.path}\n${file.content}`);
  const features = snapshot.file_list.slice(0, 40).map((path) => `File: ${path}`);
  const stack = (stats?.languages || []).map((lang) => lang.name);
  return api.generateReadme(repository.fullName, snapshot.description || stats?.description || "No description provided.", stack, features, samples);
}

function ReadmeGenerator({ repository, stats }) {
  const [state, setState] = useState({ loading: false, error: "", markdown: "", copied: false });
  const generate = async () => {
    setState({ loading: true, error: "", markdown: "", copied: false });
    try { const res = await readmeFromRepository(repository, stats); setState({ loading: false, error: "", markdown: res.readme_markdown || "", copied: false }); }
    catch (err) { setState({ loading: false, error: err.message || "Could not generate a README.", markdown: "", copied: false }); }
  };
  const copy = async () => { await navigator.clipboard?.writeText(state.markdown); setState((s) => ({ ...s, copied: true })); };
  const download = () => {
    const url = URL.createObjectURL(new Blob([state.markdown], { type: "text/markdown" }));
    Object.assign(document.createElement("a"), { href: url, download: "README.md" }).click();
    URL.revokeObjectURL(url);
  };
  return <section className="rounded-xl border border-gpt-border p-5 space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="flex items-center gap-2 text-violet-300"><FileText size={18} /><h3 className="font-semibold">README generator</h3></div>
        <p className="text-sm text-gpt-subtext mt-1">Reads the repository's key files from GitHub and drafts project documentation with AI.</p></div>
      <button className="button-dark" onClick={generate} disabled={state.loading}>{state.loading ? <RotateCw size={16} className="animate-spin" /> : <FileText size={16} />}{state.loading ? "Generating…" : state.markdown ? "Regenerate README" : "Generate README"}</button>
    </div>
    {state.error && <div role="alert" className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-4 text-sm text-rose-300 flex gap-2"><AlertCircle size={18} className="shrink-0" />{state.error}</div>}
    {state.markdown && <>
      <div className="flex gap-2"><button className="saas-secondary" onClick={copy}>{state.copied ? <Check size={15} /> : <Copy size={15} />}{state.copied ? "Copied" : "Copy markdown"}</button><button className="saas-secondary" onClick={download}><Download size={15} />Download README.md</button></div>
      <div className="chat-markdown max-h-[32rem] overflow-y-auto rounded-xl bg-gpt-surface/60 border border-gpt-border p-5"><ReactMarkdown skipHtml>{state.markdown}</ReactMarkdown></div>
    </>}
  </section>;
}

export default function RepositoryInsights({ repository, token }) {
  const [stats, setStats] = useState(null), [error, setError] = useState(""), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setError(""); setStats(null);
    api.getRepoStats(repository.owner, repository.repo, token).then((data) => { if (!cancelled) setStats(data); })
      .catch((err) => { if (!cancelled) setError(err.message || "Could not load repository analytics."); });
    return () => { cancelled = true; };
  }, [repository.owner, repository.repo, token, attempt]);
  return <section className="flex-1 min-h-0 overflow-y-auto bg-gpt-surface border border-gpt-border rounded-2xl p-5 space-y-5" aria-label="Repository insights">
    <div><div className="flex items-center gap-2 text-violet-300"><BarChart3 size={22} /><h2 className="font-semibold">Repository analytics</h2></div>
      <p className="text-sm text-gpt-subtext mt-2">{stats?.description || `Live GitHub statistics for ${repository.fullName}.`}</p></div>
    {error && <div role="alert" className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-4 text-sm text-rose-300 flex flex-wrap items-center gap-2"><AlertCircle size={18} className="shrink-0" />{error}<button className="text-link" onClick={() => setAttempt((n) => n + 1)}>Retry</button></div>}
    {!stats && !error && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" role="status" aria-label="Loading analytics">{[0, 1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-gpt-border/40 animate-pulse" />)}</div>}
    {stats && <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile icon={Star} label="Stars" value={stats.stars} /><StatTile icon={GitFork} label="Forks" value={stats.forks} />
        <StatTile icon={CircleDot} label="Open issues" value={stats.open_issues} /><StatTile icon={Eye} label="Watchers" value={stats.subscribers} />
      </div>
      <div className="space-y-2"><p className="text-xs font-semibold text-gpt-subtext">Languages · default branch <code>{stats.default_branch}</code></p><LanguageBreakdown languages={stats.languages} /></div>
    </>}
    <ReadmeGenerator repository={repository} stats={stats} />
  </section>;
}
