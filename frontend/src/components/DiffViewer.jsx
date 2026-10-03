import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function DiffViewer({ suggestion }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(suggestion.after_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-gpt-border bg-gpt-surface p-4 space-y-3 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-gpt-text">
            {suggestion.title}
          </span>
          <span className="text-xs text-gpt-muted">
            • {suggestion.impact} impact
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-gpt-surfaceHover hover:bg-gpt-border text-gpt-text text-xs transition"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-gpt-accent" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied" : "Copy Refactored"}</span>
        </button>
      </div>

      <p className="text-xs text-gpt-subtext leading-relaxed">
        {suggestion.rationale}
      </p>

      {/* Before and After side-by-side or stacked */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
        {/* Before */}
        <div className="rounded-xl bg-gpt-sidebar border border-gpt-border/80 p-3 overflow-hidden">
          <div className="text-xs font-semibold text-rose-600 pb-1 mb-2 border-b border-gpt-border/50">
            Original
          </div>
          <pre className="text-xs font-mono text-rose-300/90 overflow-x-auto">
            {suggestion.before_code}
          </pre>
        </div>

        {/* After */}
        <div className="rounded-xl bg-gpt-sidebar border border-gpt-border/80 p-3 overflow-hidden">
          <div className="text-xs font-semibold text-teal-300 pb-1 mb-2 border-b border-gpt-border/50">
            Optimized
          </div>
          <pre className="text-xs font-mono text-teal-300/90 overflow-x-auto">
            {suggestion.after_code}
          </pre>
        </div>
      </div>
    </div>
  );
}
