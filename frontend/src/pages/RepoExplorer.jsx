import React, { useRef, useState } from "react";
import { FolderGit2, FileCode, Search, Key, Code2, AlertCircle, ArrowRight, Star, ShieldAlert } from "lucide-react";
import RepositoryMalwareScan from "../components/RepositoryMalwareScan";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { parseGitHubInput } from "../utils/githubInput";

const LANGUAGES = { py: "python", js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript", java: "java", go: "go", rs: "rust", cpp: "cpp", cc: "cpp", cxx: "cpp", h: "cpp", hpp: "cpp", cs: "csharp" };

export default function RepoExplorer({ onOpenInWorkspace, onOpenSettings, project, onConnectedRepository, onSourceLoaded, onReport }) {
  const { githubToken, saveGithubToken } = useAuth();
  const [repoInput, setRepoInput] = useState(project?.fullName || "fastapi/fastapi");
  const [tokenInput, setTokenInput] = useState(githubToken || "");
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tree, setTree] = useState(project?.files || []);
  const [loadedRepo, setLoadedRepo] = useState(project || null);
  const [repoView, setRepoView] = useState("files");
  const [topicData, setTopicData] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [fileError, setFileError] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const repoRequest = useRef(0);
  const fileRequest = useRef(0);
  const language = LANGUAGES[selectedFile?.split(".").pop()?.toLowerCase()];
  const canAnalyze = language && fileContent.trim() && fileContent.length <= 20000 && !loadingFile && !fileError;

  const handleFetchRepo = async (input = repoInput) => {
    let target;
    try { target = parseGitHubInput(input); } catch (err) { setError(err.message); return; }
    const request = ++repoRequest.current;
    ++fileRequest.current;
    setLoading(true); setError(null); setSelectedFile(null); setFileContent("");
    setFileError(null); setLoadingFile(false); setTree([]); setLoadedRepo(null); setTopicData(null); setRepoView("files");
    try {
      if (target.kind === "topic") {
        const data = await api.getTopicRepos(target.topic, tokenInput);
        if (request === repoRequest.current) setTopicData(data);
      } else {
        const data = await api.getRepoTree(target.owner, target.repo, null, tokenInput);
        if (request !== repoRequest.current) return;
        setTree(data); setLoadedRepo(target);
        await onConnectedRepository?.(target, data);
      }
    } catch (err) { if (request === repoRequest.current) setError(err.message); }
    finally { if (request === repoRequest.current) setLoading(false); }
  };

  const handleSelectFile = async (path) => {
    if (!loadedRepo) return;
    const request = ++fileRequest.current;
    setSelectedFile(path); setFileContent(""); setFileError(null); setLoadingFile(true);
    try {
      const result = await api.getRepoFile(loadedRepo.owner, loadedRepo.repo, path, tokenInput);
      if (request === fileRequest.current) { setFileContent(result.content); onSourceLoaded?.(path, result.content); }
    } catch (err) { if (request === fileRequest.current) setFileError(err.message); }
    finally { if (request === fileRequest.current) setLoadingFile(false); }
  };

  const openAnalysis = () => {
    if (canAnalyze) onOpenInWorkspace({ code: fileContent, language, tool: "bugs" });
  };

  return <div className="h-[calc(100vh-3.5rem)] flex flex-col p-4 sm:p-6 space-y-3 overflow-hidden">
    <form onSubmit={(event) => { event.preventDefault(); handleFetchRepo(); }} className="flex flex-wrap items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-2 flex-1 min-w-0 max-w-2xl">
        <div className="relative flex-1 min-w-0"><Search className="w-4 h-4 text-gpt-muted absolute left-3 top-2.5" />
          <input aria-label="GitHub repository or topic" readOnly={Boolean(project)} value={repoInput} onChange={(event) => setRepoInput(event.target.value)} placeholder="GitHub URL, topic URL, or owner/repo"
            className="w-full bg-gpt-surface border border-gpt-border rounded-xl pl-9 pr-3 py-2 text-xs text-gpt-text placeholder-gpt-muted" /></div>
        <button disabled={loading} className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shrink-0 disabled:opacity-40">{loading ? "Loading..." : project ? "Refresh inventory" : "Load Repo"}</button>
      </div>
      <button type="button" onClick={() => setShowTokenInput(!showTokenInput)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gpt-surface hover:bg-gpt-surfaceHover text-gpt-muted text-xs border border-gpt-border"><Key size={14} />{githubToken ? "Token Configured" : "GitHub Token"}</button>
    </form>
    <p className="text-xs text-gpt-muted shrink-0">{project ? `Saved inventory: ${tree.length} of ${project.fileCount} discovered text files. Open files to use them in project Q&A; up to five recent files stay in memory.` : "Connect a GitHub repository to save its identity and file inventory. Topic URLs let you choose a repository."}</p>
    {showTokenInput && <div className="bg-gpt-surface border border-gpt-border rounded-xl p-3 flex flex-wrap gap-2 shrink-0">
      <input aria-label="GitHub access token" type="password" value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} placeholder="Optional token for private repos or higher limits" className="flex-1 min-w-0 bg-gpt-sidebar border border-gpt-border rounded-lg px-3 py-2 text-xs" />
      <button onClick={() => { saveGithubToken(tokenInput); setShowTokenInput(false); }} className="px-3 py-2 rounded-lg bg-violet-600 text-white text-xs font-semibold">Use token</button>
      <p className="basis-full text-xs text-gpt-muted">Kept in memory for this session. Public repositories can be loaded without a token.</p>
    </div>}
    {error && <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex gap-2 shrink-0"><AlertCircle size={16} className="shrink-0" />{error}</div>}
    {loading && <p role="status" className="text-xs text-violet-600 shrink-0">Connecting to GitHub…</p>}
    {loadedRepo && <div className="flex gap-2 flex-wrap shrink-0">
      <button onClick={() => setRepoView("files")} aria-pressed={repoView === "files"} className={`px-3 py-2 text-xs rounded-lg border ${repoView === "files" ? "bg-violet-500/10 border-violet-500/25 text-violet-300" : "bg-gpt-surface border-gpt-border text-gpt-muted"}`}>Files</button>
      <button onClick={() => setRepoView("malware")} aria-pressed={repoView === "malware"} className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg border ${repoView === "malware" ? "bg-violet-500/10 border-violet-500/25 text-violet-300" : "bg-gpt-surface border-gpt-border text-gpt-muted"}`}><ShieldAlert size={15} />Gemini malware scan</button>
    </div>}
    {topicData ? <section className="repo-topic-panel flex-1 min-h-0 overflow-y-auto bg-gpt-surface border border-gpt-border rounded-2xl p-5">
      <div className="section-title"><div><h2>Choose a repository</h2><p className="text-xs text-gpt-muted mt-2">Topic: {topicData.topic} · Showing {topicData.repositories.length} of {topicData.total_count.toLocaleString()} matching repositories, sorted by stars.</p></div></div>
      {topicData.incomplete_results && <p className="text-xs text-amber-300 mb-3">GitHub returned partial search results. You can still select a repository below.</p>}
      {!topicData.repositories.length && <p className="text-sm text-gpt-muted">No repositories found for this topic. Try a different topic or paste a repository URL.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{topicData.repositories.map((repo) => <button key={repo.full_name} onClick={() => { setRepoInput(repo.full_name); handleFetchRepo(repo.full_name); }} className="text-left p-4 rounded-xl border border-gpt-border bg-gpt-sidebar hover:border-violet-300 transition">
        <div className="flex gap-2 items-center text-sm font-semibold text-violet-300"><FolderGit2 size={17} className="shrink-0" /><span className="truncate">{repo.full_name}</span><ArrowRight size={16} className="ml-auto shrink-0" /></div>
        <p className="text-xs text-gpt-subtext mt-2 line-clamp-2">{repo.description || "Open this repository to browse its source files."}</p>
        <div className="flex gap-4 items-center mt-3 text-xs text-gpt-muted"><span>{repo.language || "Multiple languages"}</span><span className="flex gap-1 items-center"><Star size={12} />{repo.stars.toLocaleString()}</span></div>
      </button>)}</div>
    </section> : loadedRepo && repoView === "malware" ? <RepositoryMalwareScan key={loadedRepo.fullName} repository={loadedRepo} token={tokenInput} onOpenSettings={onOpenSettings} onReport={onReport} /> : <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-hidden">
      <section className="repo-file-tree lg:col-span-4 rounded-2xl border border-gpt-border bg-gpt-surface p-4 flex flex-col gap-3 overflow-hidden">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-gpt-border text-xs"><span className="font-medium text-gpt-text flex items-center gap-1.5 min-w-0"><FolderGit2 size={16} className="text-gpt-accent shrink-0" /><span className="truncate">{loadedRepo?.fullName || "Files"}</span></span><span className="text-gpt-muted shrink-0">{tree.length} files</span></div>
        <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">{tree.length ? tree.map((item) => <button key={item.path} onClick={() => handleSelectFile(item.path)} title={item.path}
          className={`w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-mono transition ${selectedFile === item.path ? "bg-violet-600 text-white" : "text-gpt-subtext hover:bg-gpt-surfaceHover"}`}><FileCode size={14} className="shrink-0 opacity-70" /><span className="truncate">{item.path}</span></button>)
          : <div className="h-full flex items-center justify-center text-center p-6 text-gpt-muted text-xs">{loading ? "Loading repository files…" : loadedRepo ? "No text files are available in this repository." : "Load a repository to browse its files."}</div>}</div>
      </section>
      <section className="repo-file-preview lg:col-span-8 rounded-2xl border border-gpt-border bg-gpt-surface p-4 flex flex-col gap-3 overflow-hidden">
        {selectedFile ? <>
          <div className="flex flex-wrap gap-2 items-center justify-between pb-2 border-b border-gpt-border text-xs"><span className="font-mono text-gpt-text break-all">{selectedFile}</span><button onClick={openAnalysis} disabled={!canAnalyze}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold disabled:opacity-40"><Code2 size={14} />Analyze in Workspace</button></div>
          {loadingFile ? <p role="status" className="text-xs text-gpt-muted">Loading file…</p> : fileError ? <p role="alert" className="text-xs text-rose-300">{fileError}</p> : <>
            {!language && <p className="text-xs text-amber-300">Select a Python, JavaScript, TypeScript, Java, C++, C#, Go, or Rust source file to analyze.</p>}
            {fileContent.length > 20000 && <p className="text-xs text-amber-300">This file exceeds the 20,000-character analysis limit. Copy a smaller function into the code workspace, or choose a smaller file.</p>}
            {!fileContent.trim() && <p className="text-xs text-gpt-muted">This file is empty. Choose another source file.</p>}
            <pre className="flex-1 min-h-0 p-4 rounded-xl bg-gpt-sidebar border border-gpt-border text-xs font-mono text-gpt-text overflow-auto whitespace-pre">{fileContent}</pre>
          </>}
        </> : <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gpt-muted gap-2"><p className="text-sm font-semibold text-gpt-text">Inspect repository source</p><p className="text-xs max-w-xs">Connect a repository, then select a file. Source is treated as data and never executed.</p></div>}
      </section>
    </div>}
  </div>;
}
