import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Command, UserRound } from "lucide-react";

function CopyButton({ value, label = "Copy answer", className = "chat-copy" }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setFailed(false); }
    catch { setFailed(true); }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setCopied(false); setFailed(false); }, 2000);
  };
  return <button className={className} onClick={copy} aria-label={label}>
    {copied ? "Copied" : failed ? "Copy unavailable" : label}
  </button>;
}

function CodeBlock({ children }) {
  const code = React.Children.toArray(children)[0];
  const language = code?.props?.className?.replace("language-", "") || "code";
  return <div className="chat-code-block"><div className="chat-code-heading"><span>{language}</span><CopyButton value={String(code?.props?.children || "")} label="Copy code" /></div><pre>{children}</pre></div>;
}

export default function ChatMessages({ messages, streaming }) {
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, streaming]);
  return <div className="chat-messages">
    {messages.map((message, index) => !message.content && !message.failed ? null :
      <article key={index} aria-label={message.role === "user" ? "Your message" : "Assistant response"} className={`chat-message ${message.role === "user" ? "from-user" : "from-assistant"}`}>
        <span className="chat-avatar" aria-hidden="true">{message.role === "user" ? <UserRound size={16} /> : <Command size={16} />}</span>
        <div className="chat-message-body"><span className="chat-author">{message.role === "user" ? "You" : "DevMind"}</span>{message.failed && <div className="chat-message-label">{message.content ? "Incomplete response" : "Response unavailable"}</div>}
          {message.role === "user" ? <p className="chat-user-text">{message.content}</p> : <div className="chat-markdown"><ReactMarkdown skipHtml components={{ pre: CodeBlock, a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" /> }}>{message.content}</ReactMarkdown></div>}
          {message.role === "assistant" && message.content && <CopyButton value={message.content} />}
        </div>
      </article>)}
    {streaming && <div className="chat-thinking" role="status"><span className="chat-dots"><i /><i /><i /></span>Reading your code…</div>}
    <div ref={end} />
  </div>;
}
