import React, { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Check, ShieldAlert, AlertTriangle, Info } from "lucide-react";

export default function FindingCard({ finding, onSelectLine }) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const getSeverityBadge = (sev) => {
    switch (sev?.toLowerCase()) {
      case "critical":
        return {
          label: "Critical",
          dot: "bg-rose-500",
          text: "text-rose-600",
          border: "border-rose-500/30",
          bg: "bg-rose-500/10",
          icon: ShieldAlert
        };
      case "high":
        return {
          label: "High",
          dot: "bg-orange-500",
          text: "text-orange-300",
          border: "border-orange-500/30",
          bg: "bg-orange-500/10",
          icon: AlertTriangle
        };
      case "medium":
        return {
          label: "Medium",
          dot: "bg-amber-400",
          text: "text-amber-300",
          border: "border-amber-500/30",
          bg: "bg-amber-500/10",
          icon: AlertTriangle
        };
      default:
        return {
          label: "Low",
          dot: "bg-sky-400",
          text: "text-sky-700",
          border: "border-sky-500/30",
          bg: "bg-sky-500/10",
          icon: Info
        };
    }
  };

  const badge = getSeverityBadge(finding.severity);
  const Icon = badge.icon;

  const handleCopyFix = () => {
    if (finding.fixed_code) {
      navigator.clipboard.writeText(finding.fixed_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`rounded-2xl border ${badge.border} bg-gpt-bg/80 p-4 transition-all space-y-3 shadow-md hover:border-gpt-border`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={`w-7 h-7 rounded-xl ${badge.bg} flex items-center justify-center shrink-0 mt-0.5`}>
            <Icon className={`w-4 h-4 ${badge.text}`} />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className={`text-xs font-bold uppercase tracking-wider ${badge.text}`}>
                {badge.label}
              </span>
              {finding.cwe && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-gpt-surfaceHover text-gpt-subtext border border-gpt-border">
                  {finding.cwe}
                </span>
              )}
              {finding.category && (
                <span className="text-xs text-gpt-muted">
                  • {finding.category}
                </span>
              )}
            </div>
            <h4 className="text-sm font-semibold text-gpt-text mt-1">
              {finding.title}
            </h4>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {finding.line_start && (
            <button
              onClick={() => onSelectLine && onSelectLine(finding.line_start)}
              className="text-xs font-mono text-gpt-muted hover:text-gpt-text px-2 py-0.5 rounded-lg bg-gpt-surfaceHover border border-gpt-border hover:border-gpt-border transition"
            >
              L{finding.line_start}{finding.line_end ? `-${finding.line_end}` : ""}
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gpt-muted hover:text-gpt-text p-1 rounded-lg hover:bg-gpt-surfaceHover transition"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 pt-2 border-t border-gpt-border text-xs">
          <div>
            <span className="text-gpt-muted font-medium">Vulnerability Description</span>
            <p className="text-gpt-text mt-1 leading-relaxed">{finding.explanation}</p>
          </div>

          <div>
            <span className="text-gpt-muted font-medium">Remediation Action</span>
            <p className="text-gpt-text mt-1 leading-relaxed">{finding.fix}</p>
          </div>

          {finding.fixed_code && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-gpt-muted">
                <span className="font-medium text-teal-300">Recommended Secure Implementation</span>
                <button
                  onClick={handleCopyFix}
                  className="flex items-center space-x-1 px-2 py-0.5 rounded hover:bg-gpt-surfaceHover text-gpt-subtext hover:text-gpt-text transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-teal-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy Fix"}</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-xl bg-gpt-bg border border-gpt-border text-xs font-mono text-teal-300 overflow-x-auto">
                {finding.fixed_code}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
