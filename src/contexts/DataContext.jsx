import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { CHURCH_ID } from "../data/constants";
import { seedState } from "../data/seedData";
import { auth, db, hasFirebaseConfig } from "../firebase";

const STORAGE_KEY = "bethel-treasurer-state";
const FIRESTORE_STATE_PATH = `churches/${CHURCH_ID}/appState/main`;
const DataContext = createContext(null);

function hydrateState(parsed = {}) {
  return {
    ...seedState,
    ...parsed,
    settings: { ...seedState.settings, ...(parsed.settings || {}) },
    users: parsed.users || seedState.users,
    offerings: parsed.offerings || seedState.offerings,
    localFundEntries: parsed.localFundEntries || seedState.localFundEntries,
    localFund100Entries: parsed.localFund100Entries || seedState.localFund100Entries,
    localFund100Worksheet: parsed.localFund100Worksheet || seedState.localFund100Worksheet,
    missionFundEntries: parsed.missionFundEntries || seedState.missionFundEntries,
    expenditures: parsed.expenditures || seedState.expenditures,
    remittances: parsed.remittances || seedState.remittances,
    audits: parsed.audits || seedState.audits,
    auditLogs: parsed.auditLogs || seedState.auditLogs,
    drafts: parsed.drafts || []
  };
}

function addLog(state, log) {
  const stamp = new Date();
  return {
    ...state,
    auditLogs: [
      {
        id: `log-${crypto.randomUUID()}`,
        date: stamp.toISOString().slice(0, 10),
        time: stamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        device: navigator.userAgent,
        previousValue: "",
        newValue: "",
        reason: "",
        ...log
      },
      ...state.auditLogs
    ]
  };
}

function reducer(state, action) {
  switch (action.type) {
    case "ADD_OFFERING":
      return addLog({ ...state, offerings: [action.payload, ...state.offerings] }, action.log);
    case "UPDATE_OFFERING":
      return addLog({ ...state, offerings: state.offerings.map((item) => (item.id === action.payload.id ? action.payload : item)) }, action.log);
    case "ADD_LOCAL_FUND_ENTRY":
      return addLog({ ...state, localFundEntries: [action.payload, ...(state.localFundEntries || [])] }, action.log);
    case "UPDATE_LOCAL_FUND_ENTRY":
      return addLog({ ...state, localFundEntries: (state.localFundEntries || []).map((item) => (item.id === action.payload.id ? action.payload : item)) }, action.log);
    case "DELETE_LOCAL_FUND_ENTRY":
      return addLog({ ...state, localFundEntries: (state.localFundEntries || []).filter((item) => item.id !== action.payload.id) }, action.log);
    case "ADD_LOCAL_FUND_100_ENTRY":
      return addLog({ ...state, localFund100Entries: [action.payload, ...(state.localFund100Entries || [])] }, action.log);
    case "UPDATE_LOCAL_FUND_100_ENTRY":
      return addLog({ ...state, localFund100Entries: (state.localFund100Entries || []).map((item) => (item.id === action.payload.id ? action.payload : item)) }, action.log);
    case "DELETE_LOCAL_FUND_100_ENTRY":
      return addLog({ ...state, localFund100Entries: (state.localFund100Entries || []).filter((item) => item.id !== action.payload.id) }, action.log);
    case "ADD_MISSION_FUND_ENTRY":
      return addLog({ ...state, missionFundEntries: [action.payload, ...(state.missionFundEntries || [])] }, action.log);
    case "UPDATE_LOCAL_FUND_100_WORKSHEET":
      return { ...state, localFund100Worksheet: { ...(state.localFund100Worksheet || {}), ...action.payload } };
    case "ADD_EXPENDITURE":
      return addLog({ ...state, expenditures: [action.payload, ...state.expenditures] }, action.log);
    case "UPDATE_EXPENDITURE":
      return addLog({ ...state, expenditures: state.expenditures.map((item) => (item.id === action.payload.id ? action.payload : item)) }, action.log);
    case "DELETE_EXPENDITURE":
      return addLog({ ...state, expenditures: state.expenditures.filter((item) => item.id !== action.payload.id) }, action.log);
    case "ADD_REMITTANCE":
      return addLog({ ...state, remittances: [action.payload, ...state.remittances] }, action.log);
    case "UPDATE_REMITTANCE":
      return addLog({ ...state, remittances: state.remittances.map((item) => (item.id === action.payload.id ? action.payload : item)) }, action.log);
    case "DELETE_REMITTANCE":
      return addLog({ ...state, remittances: state.remittances.filter((item) => item.id !== action.payload.id) }, action.log);
    case "UPDATE_AUDIT": {
      const exists = state.audits.some((item) => item.id === action.payload.id);
      return addLog(
        { ...state, audits: exists ? state.audits.map((item) => (item.id === action.payload.id ? action.payload : item)) : [action.payload, ...state.audits] },
        action.log
      );
    }
    case "UPDATE_SETTINGS":
      return addLog({ ...state, settings: { ...state.settings, ...action.payload } }, action.log);
    case "ADD_USER":
      return addLog({ ...state, users: [action.payload, ...state.users] }, action.log);
    case "UPDATE_USER":
      return addLog({ ...state, users: state.users.map((item) => (item.id === action.payload.id ? action.payload : item)) }, action.log);
    case "RESTORE":
      return addLog(action.payload, action.log);
    case "SYNC_REMOTE":
      return hydrateState(action.payload);
    case "ADD_DRAFT":
      return { ...state, drafts: [action.payload, ...state.drafts.filter((item) => item.id !== action.payload.id)] };
    case "CLEAR_DRAFT":
      return { ...state, drafts: state.drafts.filter((item) => item.id !== action.payload) };
    default:
      return state;
  }
}

export function DataProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? hydrateState(JSON.parse(saved)) : seedState;
    } catch {
      return seedState;
    }
  });
  const stateRef = useRef(state);
  const remoteReadyRef = useRef(!hasFirebaseConfig);
  const applyingRemoteRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!hasFirebaseConfig) return undefined;
    let unsubscribe;
    let cancelled = false;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      unsubscribe?.();
      unsubscribe = undefined;
      if (!firebaseUser || cancelled) {
        remoteReadyRef.current = false;
        return;
      }
      try {
        const stateDoc = doc(db, FIRESTORE_STATE_PATH);
        unsubscribe = onSnapshot(
          stateDoc,
          (snapshot) => {
            if (snapshot.exists()) {
              const remoteState = snapshot.data()?.state;
              if (remoteState) {
                applyingRemoteRef.current = true;
                dispatch({ type: "SYNC_REMOTE", payload: remoteState });
              }
            } else {
              setDoc(stateDoc, { state: stateRef.current, updatedAt: new Date().toISOString() }).catch((error) => {
                console.warn("Unable to create shared Firestore state", error);
              });
            }
            remoteReadyRef.current = true;
          },
          (error) => {
            remoteReadyRef.current = true;
            console.warn("Unable to sync Firestore state", error);
          }
        );
      } catch (error) {
        remoteReadyRef.current = true;
        console.warn("Unable to connect shared Firestore state", error);
      }
    });
    return () => {
      cancelled = true;
      unsubscribeAuth();
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (!hasFirebaseConfig || !remoteReadyRef.current) return undefined;
    if (applyingRemoteRef.current) {
      applyingRemoteRef.current = false;
      return undefined;
    }
    const timeout = window.setTimeout(() => {
      setDoc(doc(db, FIRESTORE_STATE_PATH), { state, updatedAt: new Date().toISOString() }, { merge: true }).catch((error) => {
        console.warn("Unable to save shared Firestore state", error);
      });
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}
