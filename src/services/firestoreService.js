import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";
import { CHURCH_ID } from "../data/constants";
import { db, hasFirebaseConfig } from "../firebase";

export function monthPath(year, month, leaf) {
  return `churches/${CHURCH_ID}/financialYears/${year}/months/${String(month).padStart(2, "0")}/${leaf}`;
}

export async function listMonthlyRecords(year, month, leaf) {
  if (!hasFirebaseConfig) return [];
  const snap = await getDocs(collection(db, monthPath(year, month, leaf)));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function createFinancialRecord({ year, month, leaf, record, uniqueField }) {
  if (!hasFirebaseConfig) return record;
  const ref = collection(db, monthPath(year, month, leaf));
  return runTransaction(db, async (transaction) => {
    if (uniqueField) {
      const duplicate = await getDocs(query(ref, where(uniqueField, "==", record[uniqueField]), where("status", "!=", "Cancelled")));
      if (!duplicate.empty) throw new Error(`${uniqueField} must be unique`);
    }
    const next = doc(ref);
    transaction.set(next, { ...record, id: next.id, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return { ...record, id: next.id };
  });
}

export async function updateFinancialRecord({ year, month, leaf, id, patch }) {
  if (!hasFirebaseConfig) return { id, ...patch };
  await updateDoc(doc(db, monthPath(year, month, leaf), id), { ...patch, updatedAt: serverTimestamp() });
  return { id, ...patch };
}

export async function saveSettings(settings) {
  if (!hasFirebaseConfig) return settings;
  await setDoc(doc(db, `churches/${CHURCH_ID}/settings/main`), { ...settings, updatedAt: serverTimestamp() }, { merge: true });
  return settings;
}

export async function writeAuditLog(log) {
  if (!hasFirebaseConfig) return log;
  await addDoc(collection(db, `churches/${CHURCH_ID}/auditLogs`), { ...log, createdAt: serverTimestamp() });
  return log;
}

export async function restoreBackupToFirestore(payload) {
  if (!hasFirebaseConfig) return payload;
  const batch = writeBatch(db);
  batch.set(doc(db, `churches/${CHURCH_ID}/settings/main`), payload.settings);
  payload.users?.forEach((user) => batch.set(doc(db, `churches/${CHURCH_ID}/users/${user.id}`), user));
  payload.auditLogs?.forEach((log) => batch.set(doc(db, `churches/${CHURCH_ID}/auditLogs/${log.id}`), log));
  await batch.commit();
  return payload;
}
