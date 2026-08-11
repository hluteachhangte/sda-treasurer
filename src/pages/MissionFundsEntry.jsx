import { Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../components/Button";
import { DataTable } from "../components/DataTable";
import { Field, Input, Select } from "../components/Field";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { MONTHS } from "../data/constants";
import { money, toNumber } from "../utils/calculations";

const MISSION_FUND_FIELDS = [
  { key: "investment", label: "Investment" },
  { key: "tithe", label: "Tithe" },
  { key: "fiftyPercentFromLocalFunds", label: "50% from Local Fund" }
];

const blankAmounts = Object.fromEntries(MISSION_FUND_FIELDS.map((field) => [field.key, ""]));

export function MissionFundsEntry() {
  const { user } = useAuth();
  const { state, dispatch } = useData();
  const today = new Date();
  const defaultQuarter = state.settings.quarters.find((quarter) => quarter.months.includes(today.getMonth() + 1)) || state.settings.quarters[0];
  const [form, setForm] = useState({
    year: today.getFullYear(),
    quarter: defaultQuarter?.id || "Q1",
    date: today.toISOString().slice(0, 10),
    receivedFrom: "",
    receiptNo: "",
    amounts: blankAmounts
  });
  const [editingId, setEditingId] = useState("");

  const entries = state.missionFundEntries || [];
  const selectedQuarter = state.settings.quarters.find((quarter) => quarter.id === form.quarter) || state.settings.quarters[0];
  const duplicateReceipt = entries.some((entry) => entry.id !== editingId && entry.receiptNo === form.receiptNo && form.receiptNo.trim());
  const totalAmount = useMemo(
    () => MISSION_FUND_FIELDS.reduce((total, field) => total + toNumber(form.amounts[field.key]), 0),
    [form.amounts]
  );
  const canAdd = form.year && form.quarter && form.date && form.receivedFrom.trim() && form.receiptNo.trim() && totalAmount > 0 && !duplicateReceipt;

  function updateAmount(key, value) {
    setForm((current) => ({
      ...current,
      amounts: {
        ...current.amounts,
        [key]: value === "" ? "" : Math.max(0, Number(value || 0))
      }
    }));
  }

  function resetForm() {
    setForm((current) => ({
      ...current,
      receivedFrom: "",
      receiptNo: "",
      amounts: blankAmounts
    }));
    setEditingId("");
  }

  function addEntry() {
    if (!canAdd) return;
    const existing = entries.find((entry) => entry.id === editingId);
    const record = {
      id: editingId || crypto.randomUUID(),
      year: Number(form.year),
      quarter: form.quarter,
      quarterLabel: selectedQuarter?.label || form.quarter,
      date: form.date,
      month: new Date(form.date).getMonth() + 1,
      receivedFrom: form.receivedFrom.trim(),
      receiptNo: form.receiptNo.trim(),
      amounts: Object.fromEntries(Object.entries(form.amounts).map(([key, value]) => [key, toNumber(value)])),
      totalAmount,
      createdBy: existing?.createdBy || user.name,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedBy: user.name,
      updatedAt: new Date().toISOString()
    };
    dispatch({
      type: editingId ? "UPDATE_MISSION_FUND_ENTRY" : "ADD_MISSION_FUND_ENTRY",
      payload: record,
      log: {
        user: user.name,
        role: user.role,
        action: editingId ? "Mission fund entry edit" : "New mission fund entry",
        recordType: "Mission Fund",
        recordId: record.id,
        newValue: record.receiptNo
      }
    });
    resetForm();
  }

  function editEntry(entry) {
    setEditingId(entry.id);
    setForm({
      year: entry.year,
      quarter: entry.quarter,
      date: entry.date,
      receivedFrom: entry.receivedFrom,
      receiptNo: entry.receiptNo,
      amounts: { ...blankAmounts, ...entry.amounts }
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteEntry(entry) {
    if (!window.confirm(`Delete receipt ${entry.receiptNo}?`)) return;
    dispatch({
      type: "DELETE_MISSION_FUND_ENTRY",
      payload: entry,
      log: {
        user: user.name,
        role: user.role,
        action: "Mission fund entry delete",
        recordType: "Mission Fund",
        recordId: entry.id,
        previousValue: entry.receiptNo
      }
    });
    if (editingId === entry.id) resetForm();
  }

  const tableRows = entries.map((entry) => ({
    ...entry,
    quarterDisplay: entry.quarterLabel || entry.quarter,
    dateDisplay: formatDate(entry.date),
    monthDisplay: MONTHS[(entry.month || new Date(entry.date).getMonth() + 1) - 1],
    totalDisplay: money(entry.totalAmount, state.settings.currencySymbol)
  }));

  const columns = [
    { key: "year", label: "Year" },
    { key: "quarterDisplay", label: "Quarter" },
    { key: "dateDisplay", label: "Date" },
    { key: "receivedFrom", label: "Received From" },
    { key: "receiptNo", label: "Receipt No." },
    ...MISSION_FUND_FIELDS.map((field) => ({
      key: field.key,
      label: field.label,
      render: (row) => moneyOrBlank(row.amounts?.[field.key], state.settings.currencySymbol)
    })),
    { key: "totalDisplay", label: "Total" },
    { key: "createdBy", label: "Entered By" },
    {
      key: "actions",
      label: "Edit/Delete",
      render: (row) => (
        <div className="row-actions">
          <Button variant="ghost" onClick={() => editEntry(row)} aria-label={`Edit ${row.receiptNo}`}>
            <Pencil size={16} />
          </Button>
          <Button variant="ghost" onClick={() => deleteEntry(row)} aria-label={`Delete ${row.receiptNo}`}>
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="stack local-funds-page">
      <PageHeader title="Mission Fund Entry" subtitle="Enter mission fund receipts and keep a running table of saved entries." />

      <section className="form-card">
        <h2>Entry Details</h2>
        <div className="form-grid">
          <Field label="Year">
            <Input type="number" value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} />
          </Field>
          <Field label="Quarter">
            <Select value={form.quarter} onChange={(event) => setForm({ ...form, quarter: event.target.value })}>
              {state.settings.quarters.map((quarter) => <option key={quarter.id} value={quarter.id}>{quarter.label}</option>)}
            </Select>
          </Field>
          <Field label="Date">
            <Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
          </Field>
          <Field label="Received From">
            <Input value={form.receivedFrom} onChange={(event) => setForm({ ...form, receivedFrom: event.target.value })} />
          </Field>
          <Field label="Receipt No." error={duplicateReceipt ? "Receipt No. must be unique." : ""}>
            <Input value={form.receiptNo} onChange={(event) => setForm({ ...form, receiptNo: event.target.value })} />
          </Field>
        </div>
      </section>

      <section className="form-card">
        <h2>Mission Fund Amounts</h2>
        <div className="money-grid">
          {MISSION_FUND_FIELDS.map((field) => (
            <Field key={field.key} label={field.label}>
              <Input type="number" min="0" step="0.01" value={form.amounts[field.key]} onChange={(event) => updateAmount(field.key, event.target.value)} />
            </Field>
          ))}
        </div>
      </section>

      <section className="mini-summary-grid local-funds-summary local-funds-summary-single">
        <div className="mini-summary-card">
          <span>Total Mission Funds</span>
          <strong>{money(totalAmount, state.settings.currencySymbol)}</strong>
        </div>
      </section>

      <div className="button-row">
        <Button disabled={!canAdd} onClick={addEntry}><Plus size={18} /> {editingId ? "Update" : "Add"}</Button>
        <Button variant="ghost" onClick={resetForm}><RotateCcw size={18} /> Reset</Button>
      </div>

      <section className="form-card local-funds-table-card">
        <h2>Entered Mission Funds</h2>
        <DataTable columns={columns} rows={tableRows} />
      </section>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function moneyOrBlank(value, symbol) {
  return toNumber(value) === 0 ? "" : money(value, symbol);
}
