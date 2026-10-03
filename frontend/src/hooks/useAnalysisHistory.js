import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { subscribeToHistory, saveAnalysis, clearAnalyses } from "../firebase/history";

const GUEST_KEY = "devmind_guest_history";
const readGuestHistory = () => {
  try {
    const data = JSON.parse(localStorage.getItem(GUEST_KEY) || "[]");
    return Array.isArray(data) ? data.slice(0, 50) : [];
  } catch { return []; }
};

export function useAnalysisHistory() {
  const { user, loading } = useAuth();
  const cloudUid = user && !user.isGuest ? user.uid : null;
  const owner = loading ? "loading" : cloudUid || "guest";
  const ownerRef = useRef(owner);
  ownerRef.current = owner;
  const [state, setState] = useState({ owner: null, items: [], error: "", pending: false });

  useEffect(() => {
    setState({ owner, items: owner === "guest" ? readGuestHistory() : [], error: "", pending: Boolean(cloudUid) });
    if (!cloudUid || loading) return;
    const update = (next) => {
      if (ownerRef.current === owner) setState({ owner, ...next });
    };
    return subscribeToHistory(cloudUid,
      (items) => update({ items, error: "", pending: false }),
      () => update({ items: [], error: "Could not load Firebase history. Check your connection and Firestore rules.", pending: false }));
  }, [cloudUid, owner, loading]);

  const save = async (item) => {
    if (loading) throw new Error("Wait for sign-in to finish before saving.");
    const saved = { ...item, id: crypto.randomUUID() };
    if (cloudUid) return saveAnalysis(cloudUid, saved);
    const items = [saved, ...readGuestHistory()].slice(0, 50);
    localStorage.setItem(GUEST_KEY, JSON.stringify(items));
    setState({ owner, items, error: "", pending: false });
  };
  const clear = async () => {
    try {
      if (cloudUid) await clearAnalyses(cloudUid);
      else {
        localStorage.removeItem(GUEST_KEY);
        setState({ owner, items: [], error: "", pending: false });
      }
    } catch {
      if (ownerRef.current === owner) setState((prev) => ({ ...prev, error: "Could not clear history. Please try again." }));
    }
  };

  return { history: state.owner === owner ? state.items : [], save, clear,
    error: state.owner === owner ? state.error : "", pending: loading || (state.owner === owner && state.pending),
    storageLabel: cloudUid ? "Firebase history · latest 50 analyses" : "Guest history · saved on this device" };
}
