import { collection, doc, setDoc, onSnapshot, orderBy, query, limit, getDocs, writeBatch } from "firebase/firestore";
import { db } from "./config";

const analyses = (uid) => collection(db, "users", uid, "analyses");

export function subscribeToHistory(uid, onChange, onError) {
  return onSnapshot(query(analyses(uid), orderBy("timestamp", "desc"), limit(50)),
    (snapshot) => onChange(snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id }))), onError);
}

export async function saveAnalysis(uid, item) {
  await setDoc(doc(analyses(uid), item.id), item);
}

export async function clearAnalyses(uid) {
  // Include older entries outside the UI's 50-item window.
  while (true) {
    const snapshot = await getDocs(query(analyses(uid), limit(100)));
    if (snapshot.empty) return;
    const batch = writeBatch(db);
    snapshot.docs.forEach((entry) => batch.delete(entry.ref));
    await batch.commit();
  }
}
