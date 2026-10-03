import React from "react";
import { ArrowUp } from "lucide-react";

export default function ChatComposer({ chat, inputRef, contextOpen, setContextOpen, connectionError }) {
  const error = chat.error || connectionError;
  const handleKey = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent?.isComposing) {
      event.preventDefault(); chat.send();
    }
  };
  return <div className="chat-composer-area">
    {error && <div role="alert" className="chat-error">{error}</div>}
    {contextOpen && <div className="chat-context-panel"><div><span>Code context</span><button onClick={() => setContextOpen(false)} aria-label="Close code context">Close</button></div>
      <textarea aria-label="Code context" value={chat.context} onChange={(event) => chat.setContext(event.target.value)} disabled={chat.streaming} maxLength={20000} placeholder="Paste relevant source code, file paths, or an error log…" rows={4} />
      <p>Shared with the assistant · {chat.context.length.toLocaleString()} characters <button onClick={() => { chat.setContext(""); setContextOpen(false); }} disabled={chat.streaming}>Remove context</button></p>
    </div>}
    <form className="chat-composer" onSubmit={chat.send}>
      <textarea ref={inputRef} aria-label="Message DevMind" value={chat.input} onChange={(event) => chat.setInput(event.target.value)} onKeyDown={handleKey} placeholder="Message DevMind" rows={2} disabled={chat.streaming} />
      <div className="chat-composer-tools"><button type="button" className={`chat-attach ${chat.context ? "has-context" : ""}`} aria-label="Attach code context" aria-expanded={contextOpen} onClick={() => setContextOpen(!contextOpen)} disabled={chat.streaming}>{chat.context ? "Code attached" : "Add code"}</button>
        <button type="submit" className="chat-send" aria-label="Send message" disabled={chat.streaming || chat.blocked || !chat.input.trim()}><ArrowUp size={20} /></button>
      </div>
    </form>
    <p className="chat-footer-note">{chat.blocked ? "Connect Gemini to enable project questions." : "AI can make mistakes. Review its answers."}</p>
  </div>;
}
