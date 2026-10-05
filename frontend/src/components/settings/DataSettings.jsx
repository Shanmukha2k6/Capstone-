import React, { useState } from "react";
import { FolderGit2, History, ScanSearch, Trash2 } from "lucide-react";

function ClearHistory({ count, onClear }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const clear = async () => { setBusy(true); try { await onClear(); } finally { setBusy(false); setConfirming(false); } };
  if (!count) return <button className="settings-secondary" disabled>Nothing to clear</button>;
  if (!confirming) return <button className="settings-danger" onClick={() => setConfirming(true)}><Trash2 size={15} />Clear history</button>;
  return <div className="settings-confirm">
    <button className="settings-secondary" onClick={() => setConfirming(false)} disabled={busy}>Cancel</button>
    <button className="settings-danger solid" onClick={clear} disabled={busy}><Trash2 size={15} />{busy ? "Clearing…" : `Delete ${count} item${count === 1 ? "" : "s"}`}</button>
  </div>;
}

export default function DataSettings({ security, historyState, onOpenProjects }) {
  const stats = [
    [FolderGit2, "Repositories", security?.projects?.length || 0],
    [ScanSearch, "Saved reviews", security?.reviews?.length || 0],
    [History, "Snippet analyses", historyState?.history?.length || 0],
  ];
  return <>
    <section className="settings-card">
      <h2>Workspace data</h2>
      <p>{security?.cloud ? "Stored in Firestore collections that only your account can access." : "Stored on this device."}</p>
      <div className="data-stats">{stats.map(([Icon, label, value]) => <div key={label}><Icon size={18} /><strong>{value}</strong><span>{label}</span></div>)}</div>
      <div className="settings-footer"><p>Repositories and their review history are managed from the Projects page.</p><button className="settings-secondary" onClick={onOpenProjects}>Open projects</button></div>
    </section>
    <section className="settings-card settings-row danger-zone">
      <div><h2>Clear snippet history</h2><p>Permanently delete every saved snippet analysis. Repository reviews are not affected. This can't be undone.</p></div>
      <ClearHistory count={historyState?.history?.length || 0} onClear={historyState?.clear} />
    </section>
    {historyState?.error && <p role="alert" className="saas-error">{historyState.error}</p>}
  </>;
}
