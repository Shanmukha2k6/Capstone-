import React from "react";
import { Paperclip, SendHorizontal, X } from "lucide-react";

function ContextPanel({ chat, onClose }) {
  return <div className="chat-context-panel">
    <div><span><Paperclip size={14} /> Code context</span><button onClick={onClose} aria-label="Close code context"><X size={15} /></button></div>
    <textarea aria-label="Code context" value={chat.context} onChange={(event) => chat.setContext(event.target.value)} disabled={chat.streaming} maxLength={20000}
      placeholder="Paste relevant source code, file paths, or an error log…" rows={4} />
    <p>Shared with the assistant · {chat.context.length.toLocaleString()} / 20,000 characters
      <button onClick={() => { chat.setContext(""); onClose(); }} disabled={chat.streaming}>Remove context</button></p>
  </div>;
}

export default function ChatComposer({ chat, inputRef, contextOpen, setContextOpen, connectionError }) {
  const error = chat.error || connectionError;
  const handleKey = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent?.isComposing) {
      event.preventDefault(); chat.send();
    }
  };
  return <div className="chat-composer-area">
    {error && <div role="alert" className="chat-error">{error}</div>}
    {contextOpen && <ContextPanel chat={chat} onClose={() => setContextOpen(false)} />}
    <form className="chat-composer" onSubmit={chat.send}>
      <textarea ref={inputRef} aria-label="Message DevMind" value={chat.input} onChange={(event) => chat.setInput(event.target.value)} onKeyDown={handleKey}
        placeholder="Ask a question about your code…" rows={2} disabled={chat.streaming} />
      <div className="chat-composer-tools">
        <button type="button" className={`chat-attach ${chat.context ? "has-context" : ""}`} aria-label="Attach code context" aria-expanded={contextOpen}
          onClick={() => setContextOpen(!contextOpen)} disabled={chat.streaming}><Paperclip size={14} />{chat.context ? "Code attached" : "Attach code"}</button>
        <span className="chat-hint">{chat.blocked ? "Connect Gemini to ask about this repository" : "Enter to send · Shift + Enter for a new line"}</span>
        <button type="submit" className="chat-send" aria-label="Send message" disabled={chat.streaming || chat.blocked || !chat.input.trim()}>Ask <SendHorizontal size={15} /></button>
      </div>
    </form>
    <p className="chat-footer-note">DevMind can make mistakes. Verify answers against the source.</p>
  </div>;
}
