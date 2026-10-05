import React, { useRef, useState } from "react";
import { ClipboardPaste, FileCode2, Paperclip, SendHorizontal, X } from "lucide-react";
import { ATTACH_ACCEPT, CONTEXT_LIMIT, appendFilesToContext, attachedFileNames } from "../../utils/attachFiles";

function ContextPanel({ chat, onClose }) {
  const files = attachedFileNames(chat.context);
  return <div className="chat-context-panel">
    <div><span><Paperclip size={14} /> Code context</span><button onClick={onClose} aria-label="Close code context"><X size={15} /></button></div>
    {files.length > 0 && <ul className="chat-attached-files" aria-label="Attached files">{files.map((name, i) => <li key={`${name}-${i}`}><FileCode2 size={12} />{name}</li>)}</ul>}
    <textarea aria-label="Code context" value={chat.context} onChange={(event) => chat.setContext(event.target.value)} disabled={chat.streaming} maxLength={CONTEXT_LIMIT}
      placeholder="Paste relevant source code, file paths, or an error log…" rows={4} />
    <p>Shared with the assistant · {chat.context.length.toLocaleString()} / {CONTEXT_LIMIT.toLocaleString()} characters
      <button onClick={() => { chat.setContext(""); onClose(); }} disabled={chat.streaming}>Remove context</button></p>
  </div>;
}

export default function ChatComposer({ chat, inputRef, contextOpen, setContextOpen, connectionError }) {
  const fileRef = useRef(null);
  const [attachError, setAttachError] = useState("");
  const error = chat.error || connectionError || attachError;
  const handleKey = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent?.isComposing) {
      event.preventDefault(); chat.send();
    }
  };
  const attachFiles = async (event) => {
    const { context, skipped } = await appendFilesToContext(event.target.files, chat.context);
    event.target.value = "";
    chat.setContext(context); setContextOpen(true);
    setAttachError(skipped.length ? `Not attached: ${skipped.join(", ")}.` : "");
  };
  const fileCount = attachedFileNames(chat.context).length;
  return <div className="chat-composer-area">
    {error && <div role="alert" className="chat-error">{error}</div>}
    {contextOpen && <ContextPanel chat={chat} onClose={() => setContextOpen(false)} />}
    <form className="chat-composer" onSubmit={chat.send}>
      <textarea ref={inputRef} aria-label="Message DevMind" value={chat.input} onChange={(event) => chat.setInput(event.target.value)} onKeyDown={handleKey}
        placeholder="Ask a question about your code…" rows={2} disabled={chat.streaming} />
      <div className="chat-composer-tools">
        <input ref={fileRef} type="file" multiple accept={ATTACH_ACCEPT} className="sr-only" aria-label="Choose files to attach" onChange={attachFiles} tabIndex={-1} />
        <button type="button" className={`chat-attach ${fileCount ? "has-context" : ""}`} aria-label="Attach files" onClick={() => fileRef.current?.click()} disabled={chat.streaming}>
          <Paperclip size={14} />{fileCount ? `${fileCount} file${fileCount === 1 ? "" : "s"} attached` : "Attach files"}</button>
        <button type="button" className={`chat-attach ${chat.context && !fileCount ? "has-context" : ""}`} aria-label="Attach code context" aria-expanded={contextOpen}
          onClick={() => setContextOpen(!contextOpen)} disabled={chat.streaming}><ClipboardPaste size={14} />{chat.context && !fileCount ? "Code attached" : "Paste code"}</button>
        <span className="chat-hint">{chat.blocked ? "Connect Gemini to ask about this repository" : "Enter to send · Shift + Enter for a new line"}</span>
        <button type="submit" className="chat-send" aria-label="Send message" disabled={chat.streaming || chat.blocked || !chat.input.trim()}>Ask <SendHorizontal size={15} /></button>
      </div>
    </form>
    <p className="chat-footer-note">DevMind can make mistakes. Verify answers against the source.</p>
  </div>;
}
