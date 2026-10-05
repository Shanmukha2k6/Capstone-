import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Bug,
  BookOpen,
  FileCode2,
  Play,
  RotateCw,
  Copy,
  Check,
  CheckCircle,
  AlertCircle,
  Flame,
  ArrowRight
} from "lucide-react";
import CodeEditor, { SAMPLE_CODES } from "../components/CodeEditor";
import FindingCard from "../components/FindingCard";
import DiffViewer from "../components/DiffViewer";
import { api } from "../api/client";

const DOC_STYLES = { java: "javadoc", kotlin: "javadoc", javascript: "jsdoc", typescript: "jsdoc" };
export const docStyleFor = (language) => DOC_STYLES[(language || "").toLowerCase()] || "google";

export default function CodeWorkspace({ onSaveAnalysis, preloadData }) {
  const [code, setCode] = useState(SAMPLE_CODES.python);
  const [language, setLanguage] = useState("python");
  const [activeTab, setActiveTab] = useState("bugs");
  const [explainLevel, setExplainLevel] = useState("intermediate");
  const [refactorFocus, setRefactorFocus] = useState("all");

  useEffect(() => {
    if (preloadData?.code) {
      setCode(preloadData.code);
      if (preloadData.language) {
        setLanguage(preloadData.language);
      }
      if (preloadData.tool) {
        setActiveTab(preloadData.tool);
      }
      setExplainData(preloadData.tool === "explain" ? preloadData.data : null);
      setBugData(preloadData.tool === "bugs" ? preloadData.data : null);
      setRefactorData(preloadData.tool === "refactor" ? preloadData.data : null);
      setDocData(preloadData.tool === "docs" ? preloadData.data : null);
    }
  }, [preloadData]);

  // Output states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [explainData, setExplainData] = useState(null);
  const [bugData, setBugData] = useState(null);
  const [refactorData, setRefactorData] = useState(null);
  const [docData, setDocData] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleRunAnalysis = async () => {
    if (!code.trim() || loading) return;
    if (code.length > 20000) {
      setError("Keep your code under 20,000 characters for this sample.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (activeTab === "explain") {
        const res = await api.explainCode(code, language, explainLevel);
        setExplainData(res);
        onSaveAnalysis && await onSaveAnalysis({
          type: "explain",
          title: `Explanation (${language})`,
          timestamp: new Date().toISOString(),
          data: res,
          code, language, codeSnippet: code.slice(0, 100)
        });
      } else if (activeTab === "bugs") {
        const res = await api.scanBugs(code, language);
        setBugData(res);
        onSaveAnalysis && await onSaveAnalysis({
          type: "bugs",
          title: `Bug Scan (${language}) - ${res.findings?.length || 0} issues`,
          timestamp: new Date().toISOString(),
          data: res,
          code, language, codeSnippet: code.slice(0, 100)
        });
      } else if (activeTab === "refactor") {
        const res = await api.suggestRefactor(code, language, refactorFocus);
        setRefactorData(res);
        onSaveAnalysis && await onSaveAnalysis({
          type: "refactor",
          title: `Refactor Suggestions (${language})`,
          timestamp: new Date().toISOString(),
          data: res,
          code, language, codeSnippet: code.slice(0, 100)
        });
      } else if (activeTab === "docs") {
        const res = await api.generateDocstrings(code, language, docStyleFor(language));
        setDocData(res);
        onSaveAnalysis && await onSaveAnalysis({
          type: "docs",
          title: `${docStyleFor(language) === "javadoc" ? "JavaDocs" : "Docstrings"} (${language})`,
          timestamp: new Date().toISOString(),
          data: res,
          code, language, codeSnippet: code.slice(0, 100)
        });
      }
    } catch (err) {
      setError(err.message || "An error occurred during analysis.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-3.5rem)] flex flex-col p-4 sm:p-5 space-y-3 lg:overflow-hidden select-none">
      {/* Sleek Tool Control Bar */}
      <p className="text-xs text-gpt-muted">Demo responses are illustrative when the backend uses mock mode. AI findings need human review.</p>
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Segmented Control */}
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-2xl bg-gpt-surface/90 border border-gpt-border shadow-sm">
          {[
            { id: "bugs", label: "Bug Scanner", icon: Bug },
            { id: "explain", label: "Explain Code", icon: BookOpen },
            { id: "refactor", label: "Refactor", icon: Sparkles },
            { id: "docs", label: "Documentation", icon: FileCode2 },
          ].map((t) => {
            const Icon = t.icon;
            const isCurrent = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  isCurrent
                    ? "bg-violet-500/10 text-gpt-text font-semibold shadow-md"
                    : "text-gpt-muted hover:text-gpt-text hover:bg-gpt-surfaceHover/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Options & Run Button */}
        <div className="flex items-center space-x-2.5">
          {activeTab === "explain" && (
            <select
              value={explainLevel}
              onChange={(e) => setExplainLevel(e.target.value)}
              className="bg-gpt-bg border border-gpt-border/80 text-gpt-subtext text-xs px-2.5 py-1.5 rounded-xl focus:outline-none"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="expert">Senior / Staff</option>
            </select>
          )}

          {activeTab === "refactor" && (
            <select
              value={refactorFocus}
              onChange={(e) => setRefactorFocus(e.target.value)}
              className="bg-gpt-bg border border-gpt-border/80 text-gpt-subtext text-xs px-2.5 py-1.5 rounded-xl focus:outline-none"
            >
              <option value="all">All Goals</option>
              <option value="readability">Readability</option>
              <option value="performance">Performance</option>
              <option value="maintainability">Maintainability</option>
            </select>
          )}

          <button
            disabled={loading || !code.trim()}
            onClick={handleRunAnalysis}
            className="flex items-center space-x-2 px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-semibold transition-all shadow-md shadow-violet-500/20"
          >
            {loading ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{loading ? "Analyzing..." : "Run Analysis"}</span>
          </button>
        </div>
      </div>

      {/* Main Split: Code Editor (Left) & Results (Right) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:min-h-0 lg:overflow-hidden">
        {/* Left: Code Editor Container */}
        <div className="h-80 lg:h-full overflow-hidden">
          <CodeEditor
            code={code}
            setCode={setCode}
            language={language}
            setLanguage={setLanguage}
          />
        </div>

        {/* Right: Results Panel */}
        <div className="min-h-80 lg:min-h-0 lg:h-full rounded-2xl border border-gpt-border/80 bg-gpt-surface/60 backdrop-blur-xl p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading Animation */}
          {loading && (
            <div className="space-y-3 pt-12 text-center animate-pulse">
              <div className="w-10 h-10 rounded-2xl bg-emerald-300/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-violet-600 shadow-lg shadow-emerald-500/10">
                <RotateCw className="w-5 h-5 animate-spin" />
              </div>
              <p className="text-xs font-medium text-gpt-subtext">
                Evaluating syntax trees, vulnerabilities, and time complexity...
              </p>
              <p className="text-xs text-gpt-muted">
                Processing through DevMind AI Gateway
              </p>
            </div>
          )}

          {/* TAB 1: BUGS */}
          {!loading && activeTab === "bugs" && (
            bugData ? (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-gpt-border text-xs text-gpt-muted">
                  <span className="font-medium text-gpt-text">{bugData.summary}</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-gpt-surfaceHover border border-gpt-border text-gpt-subtext">
                    {bugData.findings?.length || 0} vulnerabilities
                  </span>
                </div>

                <div className="space-y-3">
                  {bugData.findings?.map((finding, idx) => (
                    <FindingCard key={idx} finding={finding} />
                  ))}
                  {(!bugData.findings || bugData.findings.length === 0) && (
                    <div className="p-8 text-center rounded-2xl bg-emerald-300/5 border border-emerald-500/20 text-xs text-violet-600 space-y-2">
                      <CheckCircle className="w-7 h-7 mx-auto text-violet-600" />
                      <p className="font-medium text-gpt-text text-sm">Clean Bill of Health</p>
                      <p className="text-gpt-muted text-xs">No CWE or OWASP vulnerabilities detected in this snippet.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gpt-muted space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-gpt-surfaceHover/60 border border-gpt-border/60 flex items-center justify-center text-gpt-muted">
                  <Bug className="w-6 h-6 stroke-1" />
                </div>
                <p className="text-xs font-semibold text-gpt-subtext">Security & Bug Analysis</p>
                <p className="text-xs max-w-xs text-gpt-muted leading-relaxed">
                  Click <strong>Run Analysis</strong> to scan for SQL/XSS injections, memory leaks, hardcoded credentials, and edge case bugs.
                </p>
              </div>
            )
          )}

          {/* TAB 2: EXPLAIN */}
          {!loading && activeTab === "explain" && (
            explainData ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-gpt-bg/80 border border-gpt-border/70 space-y-1.5 shadow-sm">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600">
                    Executive Summary
                  </span>
                  <p className="text-sm text-gpt-text font-medium leading-relaxed">
                    {explainData.purpose}
                  </p>
                </div>

                {/* Big-O Complexity Chips */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-gpt-bg border border-gpt-border">
                    <span className="text-gpt-muted text-xs font-medium">Time Complexity</span>
                    <p className="text-violet-600 font-mono mt-1 text-xs font-semibold">{explainData.time_complexity}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-gpt-bg border border-gpt-border">
                    <span className="text-gpt-muted text-xs font-medium">Space Complexity</span>
                    <p className="text-violet-600 font-mono mt-1 text-xs font-semibold">{explainData.space_complexity}</p>
                  </div>
                </div>

                {/* Walkthrough */}
                <div className="space-y-2 pt-1">
                  <h4 className="font-semibold text-gpt-text">Execution Walkthrough</h4>
                  <ul className="space-y-2.5">
                    {explainData.walkthrough?.map((step, idx) => (
                      <li key={idx} className="flex items-start space-x-2.5 text-gpt-subtext">
                        <span className="w-5 h-5 rounded-full bg-gpt-surfaceHover border border-gpt-border text-[11px] text-violet-600 font-mono flex items-center justify-center shrink-0 mt-0.5 font-bold">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Key Concepts */}
                {explainData.key_concepts?.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="font-semibold text-gpt-text">Key Concepts</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {explainData.key_concepts.map((concept, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-gpt-surfaceHover border border-gpt-border text-gpt-text text-xs font-medium">
                          {concept}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gpt-muted space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-gpt-surfaceHover/60 border border-gpt-border/60 flex items-center justify-center text-gpt-muted">
                  <BookOpen className="w-6 h-6 stroke-1" />
                </div>
                <p className="text-xs font-semibold text-gpt-subtext">Code Explanation & Complexity</p>
                <p className="text-xs max-w-xs text-gpt-muted leading-relaxed">
                  Click <strong>Run Analysis</strong> to generate step-by-step logic explanations and time/space complexity bounds.
                </p>
              </div>
            )
          )}

          {/* TAB 3: REFACTOR */}
          {!loading && activeTab === "refactor" && (
            refactorData ? (
              <div className="space-y-3.5">
                <div className="pb-2 border-b border-gpt-border text-xs text-gpt-muted font-medium">
                  {refactorData.summary}
                </div>
                <div className="space-y-3.5">
                  {refactorData.suggestions?.map((item, idx) => (
                    <DiffViewer key={idx} suggestion={item} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gpt-muted space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-gpt-surfaceHover/60 border border-gpt-border/60 flex items-center justify-center text-gpt-muted">
                  <Sparkles className="w-6 h-6 stroke-1" />
                </div>
                <p className="text-xs font-semibold text-gpt-subtext">Clean Code & Optimization</p>
                <p className="text-xs max-w-xs text-gpt-muted leading-relaxed">
                  Proposes ranked refactoring recommendations with side-by-side diff previews.
                </p>
              </div>
            )
          )}

          {/* TAB 4: DOCS */}
          {!loading && activeTab === "docs" && (
            docData ? (
              <div className="space-y-3 flex-1 flex flex-col">
                <div className="flex items-center justify-between pb-2 border-b border-gpt-border">
                  <span className="text-xs font-semibold text-gpt-text">Annotated Source Code</span>
                  <button
                    onClick={() => copyToClipboard(docData.annotated_code)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gpt-surfaceHover hover:bg-gpt-border text-gpt-text text-xs font-medium border border-gpt-border transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-violet-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied" : "Copy Documented Code"}</span>
                  </button>
                </div>
                <pre className="flex-1 p-4 rounded-2xl bg-gpt-bg border border-gpt-border text-xs font-mono text-gpt-text overflow-x-auto whitespace-pre">
                  {docData.annotated_code}
                </pre>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gpt-muted space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-gpt-surfaceHover/60 border border-gpt-border/60 flex items-center justify-center text-gpt-muted">
                  <FileCode2 className="w-6 h-6 stroke-1" />
                </div>
                <p className="text-xs font-semibold text-gpt-subtext">Automated Documentation</p>
                <p className="text-xs max-w-xs text-gpt-muted leading-relaxed">
                  Generates production-grade docstrings and documentation while preserving code logic.
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
