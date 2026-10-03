import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import { Copy, Check, Code2 } from "lucide-react";

export const SAMPLE_CODES = {
  python: `import sqlite3

def get_user_records(user_id: str):
    # Potential vulnerability: SQL Injection via f-string
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    query = f"SELECT * FROM users WHERE id = '{user_id}'"
    cursor.execute(query)
    records = cursor.fetchall()
    conn.close()
    return records
`,
  javascript: `function fetchUserData(userId) {
  // Directly rendering unsanitized user content
  fetch('/api/user/' + userId)
    .then(res => res.json())
    .then(data => {
      document.getElementById('bio').innerHTML = data.bio;
    });
}
`,
  typescript: `interface User {
  id: string;
  name: string;
  role: string;
}

function processUsers(users: User[]) {
  const admins: User[] = [];
  for (let i = 0; i < users.length; i++) {
    for (let j = 0; j < users.length; j++) {
      if (users[i].role === 'admin' && i === j) {
        admins.push(users[i]);
      }
    }
  }
  return admins;
}
`,
  java: `public class DataProcessor {
    public static void process(String input) {
        if (input != null && input.length() > 0) {
            System.out.println("Processing: " + input);
        }
    }
}
`
};

export default function CodeEditor({
  code,
  setCode,
  language,
  setLanguage,
  highlightLine = null
}) {
  const [copied, setCopied] = useState(false);

  const languages = [
    { id: "python", label: "Python" },
    { id: "javascript", label: "JavaScript" },
    { id: "typescript", label: "TypeScript" },
    { id: "java", label: "Java" },
    { id: "cpp", label: "C++" },
    { id: "go", label: "Go" },
    { id: "rust", label: "Rust" },
    { id: "csharp", label: "C#" }
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-xl transition-all">
      {/* Editor Header Bar */}
      <div className="h-10 bg-zinc-900/90 px-4 border-b border-zinc-800 flex items-center justify-between select-none">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-mono text-zinc-300">
            editor.{language === "python" ? "py" : language === "javascript" ? "js" : language === "typescript" ? "ts" : "txt"}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Language selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-zinc-800 text-zinc-200 text-xs px-2.5 py-1 rounded-lg border border-zinc-700/80 focus:outline-none"
          >
            {languages.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>

          {/* Copy code button */}
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 min-h-0 relative bg-zinc-950">
        <Editor
          height="100%"
          language={language === "cpp" ? "cpp" : language === "csharp" ? "csharp" : language}
          value={code}
          theme="vs-dark"
          onChange={(val) => setCode(val || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'Fira Code', Menlo, Monaco, 'Courier New', monospace",
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>

      {/* Footer */}
      <div className="h-6 bg-zinc-900 border-t border-zinc-800/80 px-3 flex items-center justify-between text-[10px] text-zinc-500 font-mono select-none">
        <span>{code.split("\n").length} lines</span>
        <span>UTF-8 • Spaces: 4</span>
      </div>
    </div>
  );
}
