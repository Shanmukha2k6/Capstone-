import React from "react";

export default function ChatWelcome({ project }) {
  return <div className="chat-welcome"><h1>{project ? "Ask about this repository" : "What can I help with?"}</h1></div>;
}
