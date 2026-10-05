import React from "react";
import { ArrowUpRight, MessagesSquare } from "lucide-react";

const PROJECT_PROMPTS = [
  "Summarize the architecture of this repository",
  "Where is authentication handled?",
  "Which opened files look risky, and why?",
  "Explain the main entry point step by step",
];
const GENERAL_PROMPTS = [
  "Explain the code I'm about to attach",
  "What are common security mistakes in Node.js APIs?",
  "How should I structure tests for a FastAPI service?",
  "Review this function for edge cases",
];

export default function ChatWelcome({ project, onPick }) {
  const prompts = project ? PROJECT_PROMPTS : GENERAL_PROMPTS;
  return <div className="chat-welcome">
    <span className="chat-welcome-icon"><MessagesSquare size={24} /></span>
    <h1>{project ? <>Ask about <span>{project.fullName}</span></> : "Ask DevMind about your code"}</h1>
    <p>{project ? "Answers are grounded in the files you've opened from this repository, with file and line references."
      : "Attach a snippet or connect a repository for answers grounded in real source."}</p>
    <div className="chat-suggestions">{prompts.map((prompt) => (
      <button key={prompt} onClick={() => onPick?.(prompt)}><span>{prompt}</span><ArrowUpRight size={15} /></button>
    ))}</div>
  </div>;
}
