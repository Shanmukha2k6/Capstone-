import React, { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, Moon, ExternalLink, Trash2, LoaderCircle } from "lucide-react";
import { api } from "../api/client";

export default function Settings({ onOpenRepositories }) {
  const [status, setStatus] = useState(null);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let cancelled = false;
    api.getGeminiSettings().then((value) => { if (!cancelled) setStatus(value); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, []);
  const update = async (remove = false) => {
    setBusy(true); setError(""); setNotice("");
    try {
      setStatus(await (remove ? api.removeGeminiKey() : api.saveGeminiKey(key.trim())));
      setKey("");
      setNotice(remove ? "Session key removed." : "Session key saved. Gemini will validate it when you send a message or run a scan.");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <div className="settings-page">
    <GeminiSettingsCard status={status} apiKey={key} setKey={setKey} busy={busy} onUpdate={update} error={error} notice={notice} onOpenRepositories={onOpenRepositories} />
    <section className="settings-card appearance-card"><div className="settings-icon"><Moon size={22} /></div><div><h2>Appearance</h2><p>Dark surfaces. Bright ideas. The dark theme is active across your workspace.</p></div><span className="settings-badge">Dark theme</span></section>
  </div>;
}

function GeminiSettingsCard({ status, apiKey, setKey, busy, onUpdate, error, notice, onOpenRepositories }) {
  return <section className="settings-card">
    <div className="settings-card-heading"><div className="settings-icon"><KeyRound size={22} /></div><div><h2>Gemini API key</h2><p>Bring your own key for the AI assistant and repository security reviews.</p></div><span className={`settings-badge ${status?.configured ? "ready" : ""}`}>{busy && !status ? "Checking…" : status?.configured ? "Key configured" : "Key required"}</span></div>
    <div className="settings-status"><ShieldCheck size={18} /><p>{status?.source === "session" ? "Your session key is active. It expires within eight hours or when the backend restarts." : status?.source === "server" ? "A server key is available. Add your own key to use it for this browser session." : "Add a key to enable real Gemini chat and source reviews."} {status?.model && <span>Model: {status.model}.</span>}</p></div>
    <form onSubmit={(event) => { event.preventDefault(); onUpdate(); }}>
      <label htmlFor="gemini-api-key" className="settings-label">{status?.session_key ? "Replace API key" : "API key"}</label>
      <input id="gemini-api-key" type="password" value={apiKey} onChange={(event) => setKey(event.target.value)} placeholder="Paste your Gemini API key" autoComplete="off" spellCheck={false} minLength={20} maxLength={256} required disabled={busy} className="settings-key-input" />
      <p className="settings-help">Stored temporarily in backend memory for this browser. Never saved to browser storage, Firebase, or project files. Chat messages, attached context, and selected scan source are sent to Gemini when you use these tools.</p>
      <div className="settings-actions"><button className="button-dark" disabled={busy || apiKey.trim().length < 20} type="submit">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <KeyRound size={16} />}{status?.session_key ? "Replace key" : "Save key"}</button>{status?.session_key && <button type="button" className="settings-secondary" disabled={busy} onClick={() => onUpdate(true)}><Trash2 size={15} />Remove session key</button>}<a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="settings-guide">Get a Gemini key <ExternalLink size={14} /></a></div>
    </form>
    {error && <p role="alert" className="settings-error">{error}</p>}{notice && <p role="status" className="settings-notice">{notice}</p>}
    <div className="settings-footer"><p>Applies to the AI assistant and repository security scans. Other tools use the backend’s configured provider.</p><button className="settings-secondary" onClick={onOpenRepositories}>Open repositories</button></div>
  </section>;
}
