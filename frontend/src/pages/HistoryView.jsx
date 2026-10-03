import React, { useState, useEffect } from "react";
import { Trash2, ArrowUpRight, Code2, History } from "lucide-react";
import FindingCard from "../components/FindingCard";
import DiffViewer from "../components/DiffViewer";

function SavedResult({ item }) {
  const data = item.data || {};
  if (item.type === "bugs") return <div className="space-y-4"><p className="text-sm text-gpt-subtext">{data.summary}</p>
    {data.findings?.length ? data.findings.map((finding, index) => <FindingCard key={finding.id || index} finding={finding} />)
      : <p className="rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-300">No findings in this saved analysis.</p>}</div>;
  if (item.type === "explain") return <div className="space-y-5">
    <div className="rounded-xl bg-violet-500/10 border border-teal-500/25 p-4 text-sm text-teal-300">{data.purpose}</div>
    <div className="grid grid-cols-2 gap-3">{[["Time complexity", data.time_complexity], ["Space complexity", data.space_complexity]].map(([name, value]) =>
      <div key={name} className="rounded-xl border border-gpt-border p-4"><p className="text-xs text-gpt-muted mb-2">{name}</p><p className="text-sm font-mono">{value}</p></div>)}</div>
    <h4 className="font-semibold text-sm">How it works</h4><ol className="list-decimal pl-5 space-y-3 text-sm text-gpt-subtext">
      {data.walkthrough?.map((step, index) => <li key={index}>{step}</li>)}</ol>
    <div className="flex flex-wrap gap-2">{data.key_concepts?.map((concept) => <span key={concept} className="bg-gpt-sidebar rounded-lg px-3 py-1 text-xs text-gpt-muted">{concept}</span>)}</div>
  </div>;
  if (item.type === "refactor") return <div className="space-y-4"><p className="text-sm text-gpt-subtext">{data.summary}</p>
    {data.suggestions?.map((suggestion, index) => <DiffViewer key={suggestion.id || index} suggestion={suggestion} />)}</div>;
  return <pre className="bg-gpt-sidebar border border-gpt-border rounded-xl p-4 text-xs font-mono overflow-auto whitespace-pre">{data.annotated_code || "This saved result has no documentation."}</pre>;
}
export default function HistoryView({ history = [], onClearHistory, onOpenWorkspaceWithSnippet }) {
  const [filter, setFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState(history[0] || null);
  const filtered = filter === "all" ? history : history.filter((item) => item.type === filter);
  useEffect(() => {
    setSelectedItem((current) => filtered.find((item) => item.id === current?.id) || filtered[0] || null);
  }, [history, filter]);
  return <div className="flex flex-col gap-4">
    <div className="flex flex-wrap gap-3 items-center justify-between">
      <div className="flex items-center gap-2 text-xs text-gpt-muted"><History size={15} />{history.length} saved {history.length === 1 ? "insight" : "insights"}</div>
      <div className="flex flex-wrap gap-1 items-center">
        {["all", "explain", "bugs", "refactor", "docs"].map((name) => <button key={name} onClick={() => setFilter(name)}
          className={`px-3 py-2 rounded-lg text-xs capitalize ${filter === name ? "bg-violet-500/10 text-violet-300 font-semibold" : "text-gpt-muted hover:bg-gpt-surfaceHover"}`}>{name}</button>)}
        {history.length > 0 && <button className="icon-button" title="Clear all history" onClick={onClearHistory}><Trash2 size={15} /></button>}
      </div>
    </div>
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
      <div className="lg:col-span-4 bg-gpt-surface border border-gpt-border rounded-2xl p-2 overflow-auto space-y-1">
        {filtered.length ? filtered.map((item) => <button key={item.id} onClick={() => setSelectedItem(item)}
          className={`w-full text-left p-4 rounded-xl transition ${selectedItem?.id === item.id ? "bg-violet-500/10 border border-violet-500/25" : "border border-transparent hover:bg-gpt-sidebar"}`}>
          <div className="flex items-center justify-between gap-2 mb-3"><span className="text-[10px] uppercase tracking-wider font-semibold text-violet-600">{item.type}</span><Code2 size={15} className="text-gpt-muted" /></div>
          <h3 className="text-xs font-semibold text-gpt-text mb-2">{item.title}</h3>
          <p className="font-mono text-[11px] text-gpt-muted truncate">{item.codeSnippet}</p>
          <p className="text-[10px] text-gpt-muted mt-3">{new Date(item.timestamp).toLocaleString()}</p>
        </button>) : <div className="h-full min-h-40 flex items-center justify-center text-center p-5 text-xs text-gpt-muted">No insights in this view yet.</div>}
      </div>
      <div className="lg:col-span-8 bg-gpt-surface border border-gpt-border rounded-2xl p-5 sm:p-6 overflow-auto">
        {selectedItem ? <>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5 pb-5 border-b border-gpt-border">
            <div><span className="eyebrow">{selectedItem.language || "Code"} · {selectedItem.type}</span><h2 className="font-semibold text-gpt-text">{selectedItem.title}</h2>
              <p className="text-xs text-gpt-muted mt-2">{new Date(selectedItem.timestamp).toLocaleString()}</p></div>
            <button className="button-dark button-small" onClick={() => onOpenWorkspaceWithSnippet?.(selectedItem)}>Open in Editor <ArrowUpRight size={15} /></button>
          </div><SavedResult item={selectedItem} />
        </> : <div className="h-full min-h-64 flex flex-col items-center justify-center text-center text-gpt-muted">
          <img className="empty-art" src="/images/devmind-orbit.png" alt="" /><h3 className="text-sm font-semibold text-gpt-text mb-2">Keep your insights within reach.</h3>
          <p className="text-xs max-w-64 leading-relaxed">Select a saved analysis to revisit its results.</p>
        </div>}
      </div>
    </div>
  </div>;
}
