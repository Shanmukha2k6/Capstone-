import React, { useEffect, useState } from "react";
import { ExternalLink, KeyRound, LoaderCircle, ShieldCheck, Trash2 } from "lucide-react";
import { api } from "../../api/client";

function useGeminiSettings() {
  const [status, setStatus] = useState(null);
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
  const update = async (key, remove = false) => {
    setBusy(true); setError(""); setNotice("");
    try {
      setStatus(await (remove ? api.removeGeminiKey() : api.saveGeminiKey(key.trim())));
      setNotice(remove ? "Session key removed." : "Session key saved. Gemini will validate it when you send a message or run a scan.");
      return true;
    } catch (err) { setError(err.message); return false; }
    finally { setBusy(false); }
  };
  return { status, busy, error, notice, update };
}

const statusText = (status) => status?.source === "session" ? "Your key is active in this browser."
  : status?.source === "server" ? "A server key is available. Add your own key to use it in this browser."
  : "Add a key to enable real Gemini chat and source reviews.";

export default function GeminiKeySettings({ onOpenRepositories }) {
  const { status, busy, error, notice, update } = useGeminiSettings();
  const [key, setKey] = useState("");
  const submit = async (event) => { event.preventDefault(); if (await update(key)) setKey(""); };
  return <section className="settings-card">
    <div className="settings-card-heading"><div className="settings-icon"><KeyRound size={22} /></div>
      <div><h2>Gemini API key</h2><p>Bring your own key for the AI assistant and repository security reviews.</p></div>
      <span className={`settings-badge ${status?.configured ? "ready" : ""}`}>{busy && !status ? "Checking…" : status?.configured ? "Key configured" : "Key required"}</span></div>
    <div className="settings-status"><ShieldCheck size={18} /><p>{statusText(status)} {status?.model && <span>Model: {status.model}.</span>}</p></div>
    <form onSubmit={submit}>
      <label htmlFor="gemini-api-key" className="settings-label">{status?.session_key ? "Replace API key" : "API key"}</label>
      <input id="gemini-api-key" type="password" value={key} onChange={(event) => setKey(event.target.value)} placeholder="Paste your Gemini API key"
        autoComplete="off" spellCheck={false} minLength={20} maxLength={256} required disabled={busy} className="settings-key-input" />
      <p className="settings-help">Saved in this browser so you stay connected — remove it any time, especially on a shared computer. It is never written to Firebase or your project records. Chat messages, attached context, and scanned source are sent to Gemini when you use these tools.</p>
      <div className="settings-actions">
        <button className="button-dark" disabled={busy || key.trim().length < 20} type="submit">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <KeyRound size={16} />}{status?.session_key ? "Replace key" : "Save key"}</button>
        {status?.session_key && <button type="button" className="settings-secondary" disabled={busy} onClick={() => update("", true)}><Trash2 size={15} />Remove session key</button>}
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="settings-guide">Get a Gemini key <ExternalLink size={14} /></a>
      </div>
    </form>
    {error && <p role="alert" className="settings-error">{error}</p>}{notice && <p role="status" className="settings-notice">{notice}</p>}
    <div className="settings-footer"><p>Applies to the AI assistant and repository security scans.</p><button className="settings-secondary" onClick={onOpenRepositories}>Open repositories</button></div>
  </section>;
}
