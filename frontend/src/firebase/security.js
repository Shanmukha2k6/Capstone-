import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "./config";
import { writeSecurityRecord } from "./securityStore";

export function subscribeSecurity(uid, onChange, onError) {
  const subscriptions = ["projects", "reviews", "decisions"].map((name) => onSnapshot(
    query(collection(db, "users", uid, name), orderBy(name === "decisions" ? "updatedAt" : "createdAt", "desc"), limit(name === "decisions" ? 1000 : 100)),
    (snapshot) => onChange(name, snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id }))), onError));
  return () => subscriptions.forEach((unsubscribe) => unsubscribe());
}

export function saveSecurityRecord(uid, collectionName, record) {
  return writeSecurityRecord(db, uid, collectionName, record);
}
