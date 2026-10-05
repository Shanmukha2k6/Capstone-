import React from "react";
import { Code2, FolderGit2, Gauge, MessageSquare, History, Settings } from "lucide-react";
const pages = {
  settings: ["MAKE IT YOURS", "Settings", "Manage your account, AI key, and workspace data.", Settings],
  workspace: ["YOUR CODE, UPGRADED", "Code workspace", "Paste a snippet. Pick a tool. Find your next improvement.", Code2],
  repos: ["GITHUB CONNECTION", "Connect a repository", "Create a saved project for source reviews and finding decisions.", FolderGit2],
  quality: ["MAKE GOOD CODE GREAT", "Quality report", "A closer look at security, complexity, and maintainability.", Gauge],
  chat: ["IDEAS WELCOME HERE", "Your AI sidekick", "Talk through tricky code, brainstorm, and get unstuck.", MessageSquare],
  history: ["LOOK HOW FAR YOU'VE COME", "Analysis history", "Every explanation, fix, and refactor. All in one place.", History],
};
export default function PageHeading({ page }) {
  const info = pages[page];
  if (!info) return null;
  const Icon = info[3];
  return <div className={`page-heading page-${page}`}><div><span className="eyebrow">{info[0]}</span><h1>{info[1]}<span className="title-dot">.</span></h1><p>{info[2]}</p></div>
    <div className="page-symbol" aria-hidden="true"><Icon size={23} /></div></div>;
}
