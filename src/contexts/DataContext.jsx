import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { seedState } from "../data/seedData";

const STORAGE_KEY = "bethel-treasurer-state";
const DataContext = createContext(null);

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
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return seedState;
    const parsed = JSON.parse(saved);
    return {
      ...seedState,
      ...parsed,
      localFundEntries: parsed.localFundEntries || seedState.localFundEntries,
      localFund100Entries: parsed.localFund100Entries || seedState.localFund100Entries,
      localFund100Worksheet: parsed.localFund100Worksheet || seedState.localFund100Worksheet,
      missionFundEntries: parsed.missionFundEntries || seedState.missionFundEntries,
      drafts: parsed.drafts || []
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}
