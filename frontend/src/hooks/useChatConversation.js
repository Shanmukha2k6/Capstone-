import { useState } from "react";
import { api } from "../api/client";
import { projectContext } from "../utils/projectContext";

export function useChatConversation(connection, project = null, sourceFiles = {}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [context, setContext] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const blocked = Boolean(project) && !["gemini", "openai"].includes(connection?.provider);
  const send = (event) => sendConversation(event, { messages, input, context, streaming, connection, project, sourceFiles, blocked },
    { setMessages, setInput, setStreaming, setError });
  const reset = () => {
    if (streaming) return;
    setMessages([]); setInput(""); setContext(""); setError("");
  };
  return { messages, input, setInput, context, setContext, streaming, error, send, reset, blocked };
}

async function sendConversation(event, state, setters) {
  event?.preventDefault();
  if (!state.input.trim() || state.streaming) return;
  const { setMessages, setInput, setStreaming, setError } = setters;
  if (state.blocked) { setError("Connect Gemini in Settings to ask questions about this repository."); return; }
  const updated = [...state.messages, { role: "user", content: state.input.trim() }];
  const assistantIndex = updated.length;
  setMessages([...updated, { role: "assistant", content: "" }]);
  setInput(""); setStreaming(true); setError("");
  const updateAssistant = (transform) => setMessages((previous) => previous.map((message, index) =>
    index === assistantIndex ? transform(message) : message));
  await api.streamChat(state.project?.fullName || "Codebase", updated.filter((message) => !message.failed).map(({ role, content }) => ({ role, content })), projectContext(state.project, state.sourceFiles, state.input, state.context),
    (token) => updateAssistant((message) => ({ ...message, content: message.content + token })),
    (failure) => {
      setError(failure); setStreaming(false);
      updateAssistant((message) => ({ ...message, failed: true }));
    },
    () => setStreaming(false), state.connection?.provider);
}
