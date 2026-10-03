import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { subscribeSecurity, saveSecurityRecord } from "../firebase/security";

const GUEST_KEY = "devmind_security_workspace_v1";
const empty = () => ({ projects: [], reviews: [], decisions: [] });
function readGuest() {
  try { const data = JSON.parse(localStorage.getItem(GUEST_KEY) || "null");
    return data && ["projects", "reviews", "decisions"].every((name) => Array.isArray(data[name])) ? data : empty();
  } catch { return empty(); }
}

export function useSecurityRecords() {
  const { user, loading } = useAuth();
  const uid = user && !user.isGuest ? user.uid : null, owner = loading ? "loading" : uid || "guest";
  const [state, setState] = useState({ owner: null, ...empty(), error: "", pending: false });
  const current = useRef(state), ownerRef = useRef(owner), reviewCache = useRef(new WeakMap()); ownerRef.current = owner;
  const update = (next) => { current.current = next; setState(next); };
  useEffect(() => {
    reviewCache.current = new WeakMap();
    update({ owner, ...(owner === "guest" ? readGuest() : empty()), error: "", pending: Boolean(uid) });
    if (!uid || loading) return;
    const ready = new Set();
    return subscribeSecurity(uid, (name, items) => {
      if (ownerRef.current !== owner) return;
      ready.add(name); update({ ...current.current, [name]: items, pending: ready.size < 3, error: "" });
    }, () => { if (ownerRef.current === owner) update({ ...current.current, pending: false, error: "Could not load the security workspace. Check Firebase connectivity and rules." }); });
  }, [owner, uid, loading]);
  const persist = async (name, record) => {
    if (loading || current.current.owner !== owner || current.current.pending) throw new Error("Wait for the workspace to finish loading before saving.");
    if (current.current.error) throw new Error("Workspace data is unavailable. Reload before saving to avoid incomplete records.");
    if (uid) await saveSecurityRecord(uid, name, record);
    if (ownerRef.current !== owner) return;
    const next = { ...current.current, [name]: [record, ...current.current[name].filter((item) => item.id !== record.id)] };
    if (!uid) localStorage.setItem(GUEST_KEY, JSON.stringify({ projects: next.projects, reviews: next.reviews, decisions: next.decisions }));
    update(next);
  };
  const visible = state.owner === owner ? state : { ...empty(), error: "", pending: true };
  return { ...visible, uid, owner, ownerRef, current, persist, reviewCache };
}
