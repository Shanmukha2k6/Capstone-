import React, { useState } from "react";
import {
  Gauge,
  RotateCw,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import CodeEditor, { SAMPLE_CODES } from "../components/CodeEditor";
import { api } from "../api/client";

export default function QualityReport() {
  const [code, setCode] = useState(SAMPLE_CODES.python);
  const [language, setLanguage] = useState("python");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const handleAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.analyzeQuality(code, language);
      setReport(res);
    } catch (err) {
      setError(err.message || "Failed to audit code quality.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col p-4 sm:p-6 space-y-3 overflow-hidden select-none">
      {/* Header bar */}
      <div className="flex flex-wrap gap-3 items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-gpt-text">Quality & Maintainability Scorecard</h2>
          <p className="text-xs text-gpt-muted">Static and LLM-assisted code maintainability evaluation</p>
        </div>
        <button
          onClick={handleAudit}
          disabled={loading || !code.trim()}
          className="flex items-center space-x-2 px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-semibold transition"
        >
          {loading ? (
            <RotateCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Gauge className="w-3.5 h-3.5" />
          )}
          <span>{loading ? "Auditing..." : "Audit Quality"}</span>
        </button>
      </div>

      {/* Main split */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-hidden">
        {/* Editor (5 cols) */}
        <div className="lg:col-span-5 h-full overflow-hidden">
          <CodeEditor
            code={code}
            setCode={setCode}
            language={language}
            setLanguage={setLanguage}
          />
        </div>

        {/* Results (7 cols) */}
        <div className="lg:col-span-7 h-full rounded-2xl border border-gpt-border bg-gpt-surface p-5 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {report ? (
            <div className="space-y-5">
              {/* Score header */}
              <div className="quality-score flex items-center justify-between p-5 rounded-2xl bg-gpt-sidebar border border-gpt-border">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gpt-muted">
                    Overall Score
                  </span>
                  <h3 className="text-xl font-bold text-gpt-text mt-0.5">
                    {report.overall_score >= 85 ? "Grade A (Clean & Maintainable)" : report.overall_score >= 70 ? "Grade B (Minor Refactoring Needed)" : "Grade C (Improvements Required)"}
                  </h3>
                </div>
                <div className="text-3xl font-bold font-mono text-gpt-text">
                  {report.overall_score}<span className="text-xs text-gpt-muted">/100</span>
                </div>
              </div>

              {/* Dimension scores */}
              <div className="quality-dimensions grid grid-cols-2 gap-3">
                {[
                  { name: "Maintainability", score: report.dimensions.maintainability },
                  { name: "Security & Safety", score: report.dimensions.security },
                  { name: "Complexity", score: report.dimensions.complexity },
                  { name: "Documentation", score: report.dimensions.documentation },
                ].map((dim, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-gpt-sidebar border border-gpt-border/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gpt-subtext">{dim.name}</span>
                      <span className="font-bold text-gpt-text font-mono">{dim.score}</span>
                    </div>
                    <meter className="quality-meter" min="0" max="100" value={dim.score} aria-label={dim.name + " score"} />
                  </div>
                ))}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-gpt-sidebar border border-gpt-border/80">
                  <span className="text-[11px] text-gpt-muted uppercase">LOC</span>
                  <p className="text-sm font-semibold text-gpt-text mt-0.5 font-mono">{report.metrics.loc}</p>
                </div>
                <div className="p-3 rounded-xl bg-gpt-sidebar border border-gpt-border/80">
                  <span className="text-[11px] text-gpt-muted uppercase">Comments</span>
                  <p className="text-sm font-semibold text-gpt-text mt-0.5 font-mono">
                    {Math.round(report.metrics.comment_ratio * 100)}%
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gpt-sidebar border border-gpt-border/80">
                  <span className="text-[11px] text-gpt-muted uppercase">Complexity</span>
                  <p className="text-sm font-semibold text-gpt-text mt-0.5 font-mono">
                    {report.metrics.cyclomatic_complexity}
                  </p>
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gpt-text">Recommendations</h4>
                <div className="space-y-1.5">
                  {report.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start space-x-2 text-xs text-gpt-subtext p-2.5 rounded-xl bg-gpt-sidebar border border-gpt-border/60">
                      <CheckCircle2 className="w-3.5 h-3.5 text-gpt-accent shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gpt-muted space-y-2">
              <img className="empty-art" src="/images/devmind-orbit.png" alt="" />
              <p className="text-sm font-semibold text-gpt-text">A clearer view of your code.</p>
              <p className="text-xs max-w-xs">
                Click <strong>Audit Quality</strong> to evaluate code maintainability, security, and cyclomatic complexity.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
