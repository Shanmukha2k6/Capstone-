import React, { useEffect, useRef, useState } from "react";
import { FileCode2, FolderGit2, MessagesSquare, Plus } from "lucide-react";
import { api } from "../api/client";
import { useChatConversation } from "../hooks/useChatConversation";
import ChatWelcome from "../components/chat/ChatWelcome";
import ChatMessages from "../components/chat/ChatMessages";
import ChatComposer from "../components/chat/ChatComposer";
import "../chat.css";

const providerLabel = (connection, error) => connection?.provider === "gemini" ? "Gemini connected" : connection?.provider === "mock" ? "Gemini not connected"
  : connection?.provider || (error ? "Unavailable" : "Connecting…");

function ChatHeader({ connection, connectionError, project, fileCount, onOpenSettings, onOpenProject, onNewChat, disabled }) {
  const live = connection && connection.provider !== "mock";
  return <header className="chat-header">
    <div className="chat-header-title"><span className="chat-header-icon"><MessagesSquare size={18} /></span>
      <div><strong>Project Q&amp;A</strong>
        <span className="chat-header-meta">{project ? <button className="chat-project-chip" onClick={onOpenProject}><FolderGit2 size={13} />{project.fullName}</button> : "General questions"}
          {project && <span className="chat-file-count"><FileCode2 size={13} />{fileCount} file{fileCount === 1 ? "" : "s"} in context</span>}</span></div>
    </div>
    <div className="chat-header-actions">
      <span className={`chat-provider ${live ? "live" : ""}`}><span className={live ? "status-dot" : "status-dot offline"} />{providerLabel(connection, connectionError)}</span>
      {connection?.provider === "mock" && onOpenSettings && <button className="chat-connect" onClick={onOpenSettings}>Connect Gemini</button>}
      <button className="chat-new" onClick={onNewChat} disabled={disabled}><Plus size={15} />New chat</button>
    </div>
  </header>;
}

export default function ChatAssistant({ onOpenSettings, project = null, sourceFiles = {}, onOpenProject }) {
  const [connection, setConnection] = useState(null);
  const [connectionError, setConnectionError] = useState("");
  const [contextOpen, setContextOpen] = useState(false);
  const inputRef = useRef(null);
  const chat = useChatConversation(connection, project, sourceFiles);
  useEffect(() => {
    let cancelled = false;
    api.getChatConfig().then((config) => { if (!cancelled) setConnection(config); })
      .catch((error) => { if (!cancelled) setConnectionError(error.message); });
    return () => { cancelled = true; };
  }, []);
  const newChat = () => { chat.reset(); setContextOpen(false); inputRef.current?.focus(); };
  const pickPrompt = (prompt) => { chat.setInput(prompt); inputRef.current?.focus(); };
  return <section className={`chat-studio ${chat.messages.length ? "has-conversation" : "is-new"}`} aria-label="AI assistant conversation">
    <ChatHeader connection={connection} connectionError={connectionError} project={project} fileCount={Object.keys(sourceFiles).length}
      onOpenSettings={onOpenSettings} onOpenProject={onOpenProject} onNewChat={newChat} disabled={chat.streaming} />
    <div className="chat-scroll-area">{chat.messages.length ? <ChatMessages messages={chat.messages} streaming={chat.streaming} /> : <ChatWelcome project={project} onPick={pickPrompt} />}</div>
    <ChatComposer chat={chat} inputRef={inputRef} contextOpen={contextOpen} setContextOpen={setContextOpen} connectionError={connectionError} />
  </section>;
}
