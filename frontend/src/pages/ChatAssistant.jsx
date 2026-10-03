import React, { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useChatConversation } from "../hooks/useChatConversation";
import ChatWelcome from "../components/chat/ChatWelcome";
import ChatMessages from "../components/chat/ChatMessages";
import ChatComposer from "../components/chat/ChatComposer";
import "../chat.css";

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
  return <section className={`chat-studio ${chat.messages.length ? "has-conversation" : "is-new"}`} aria-label="AI assistant conversation">
    <div className="chat-studio-toolbar"><div className="chat-studio-title"><strong>DevMind</strong><span className="chat-provider">{connection?.provider === "gemini" ? "Gemini" : connection?.provider === "mock" ? "Demo" : connection?.provider || (connectionError ? "Unavailable" : "Connecting…")}</span>{connection?.provider === "mock" && onOpenSettings && <button className="chat-connect" onClick={onOpenSettings}>Connect Gemini</button>}</div>
      <button className="chat-new" onClick={newChat} disabled={chat.streaming}>New chat</button>
    </div>
    {project && <div className="chat-project-context"><span>{project.fullName} · {Object.keys(sourceFiles).length} opened files available for context</span>{onOpenProject && <button onClick={onOpenProject}>Open project</button>}</div>}
    <div className="chat-scroll-area">{chat.messages.length ? <ChatMessages messages={chat.messages} streaming={chat.streaming} /> : <ChatWelcome project={project} />}</div>
    <ChatComposer chat={chat} inputRef={inputRef} contextOpen={contextOpen} setContextOpen={setContextOpen} connectionError={connectionError} />
  </section>;
}
