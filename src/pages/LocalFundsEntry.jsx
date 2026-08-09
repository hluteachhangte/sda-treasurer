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

const LOCAL_FUND_FIELDS = [
  { key: "ssOffering", label: "S.S. Offering" },
  { key: "birthdayThanks", label: "Birthday & Thanks" },
  { key: "thirteenthSabbath", label: "13th Sabbath" },
  { key: "divineService", label: "Divine Service" },
  { key: "ay", label: "A.Y." }
];

const blankAmounts = Object.fromEntries(LOCAL_FUND_FIELDS.map((field) => [field.key, ""]));

export function LocalFundsEntry() {
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

  const entries = state.localFundEntries || [];
  const selectedQuarter = state.settings.quarters.find((quarter) => quarter.id === form.quarter) || state.settings.quarters[0];
  const duplicateReceipt = entries.some((entry) => entry.id !== editingId && entry.receiptNo === form.receiptNo && form.receiptNo.trim());
  const totalAmount = useMemo(
    () => LOCAL_FUND_FIELDS.reduce((total, field) => total + toNumber(form.amounts[field.key]), 0),
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
      type: editingId ? "UPDATE_LOCAL_FUND_ENTRY" : "ADD_LOCAL_FUND_ENTRY",
      payload: record,
      log: {
        user: user.name,
        role: user.role,
        action: editingId ? "Local fund entry edit" : "New local fund entry",
        recordType: "Local Fund",
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
      type: "DELETE_LOCAL_FUND_ENTRY",
      payload: entry,
      log: {
        user: user.name,
        role: user.role,
        action: "Local fund entry delete",
        recordType: "Local Fund",
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
    ...LOCAL_FUND_FIELDS.map((field) => ({
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
      <PageHeader title="Local Fund (50%) Entry" subtitle="Enter local fund receipts and keep a running table of saved entries." />

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
        <h2>Local Fund Amounts</h2>
        <div className="money-grid">
          {LOCAL_FUND_FIELDS.map((field) => (
            <Field key={field.key} label={field.label}>
              <Input type="number" min="0" step="0.01" value={form.amounts[field.key]} onChange={(event) => updateAmount(field.key, event.target.value)} />
            </Field>
          ))}
        </div>
      </section>

      <section className="mini-summary-grid local-funds-summary">
        <div className="mini-summary-card">
          <span>Total Local Funds</span>
          <strong>{money(totalAmount, state.settings.currencySymbol)}</strong>
        </div>
        <div className="mini-summary-card">
          <span>50%</span>
          <strong>{money(totalAmount * 0.5, state.settings.currencySymbol)}</strong>
        </div>
      </section>

      <div className="button-row">
        <Button disabled={!canAdd} onClick={addEntry}><Plus size={18} /> {editingId ? "Update" : "Add"}</Button>
        <Button variant="ghost" onClick={resetForm}><RotateCcw size={18} /> Reset</Button>
      </div>

      <section className="form-card local-funds-table-card">
        <h2>Entered Local Funds</h2>
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
