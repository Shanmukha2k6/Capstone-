import { doc, getDoc, setDoc } from "firebase/firestore";

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}

export async function writeSecurityRecord(database, uid, name, record) {
  const reference = doc(database, "users", uid, name, record.id);
  if (name === "reviews") {
    const existing = await getDoc(reference);
    if (existing.exists()) {
      if (JSON.stringify(canonical(existing.data())) !== JSON.stringify(canonical(record))) throw new Error("An immutable review already exists with a different payload.");
      return;
    }
  }
  await setDoc(reference, record);
}
