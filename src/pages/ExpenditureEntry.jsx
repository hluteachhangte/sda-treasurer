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

const EXPENDITURE_ENTRY_FIELDS = [
  { key: "ssDept", label: "S.S. Dept." },
  { key: "churchExpense", label: "Church Expense" },
  { key: "personalMinistries", label: "Personal/Evangelism" },
  { key: "ayExpense", label: "AY" },
  { key: "womenMinistries", label: "Women's Ministries" },
  { key: "acs", label: "ACS" },
  { key: "building", label: "Building" },
  { key: "others", label: "Others" }
];

const blankExpenseHeads = Object.fromEntries(EXPENDITURE_ENTRY_FIELDS.map((field) => [field.key, ""]));

export function ExpenditureEntry() {
  const { user } = useAuth();
  const { state, dispatch } = useData();
  const today = new Date();
  const defaultQuarter = state.settings.quarters.find((quarter) => quarter.months.includes(today.getMonth() + 1)) || state.settings.quarters[0];
  const [form, setForm] = useState({
    year: today.getFullYear(),
    quarter: defaultQuarter?.id || "Q1",
    date: today.toISOString().slice(0, 10),
    particulars: "",
    voucherNumber: "",
    expenseHeads: blankExpenseHeads
  });
  const [editingId, setEditingId] = useState("");

  const selectedQuarter = state.settings.quarters.find((quarter) => quarter.id === form.quarter) || state.settings.quarters[0];
  const duplicateVoucher = state.expenditures.some((item) => item.id !== editingId && item.voucherNumber === form.voucherNumber && form.voucherNumber.trim() && item.status !== "Cancelled");
  const totalExpenditure = useMemo(
    () => EXPENDITURE_ENTRY_FIELDS.reduce((total, field) => total + toNumber(form.expenseHeads[field.key]), 0),
    [form.expenseHeads]
  );
  const canAdd = form.year && form.quarter && form.date && form.particulars.trim() && form.voucherNumber.trim() && totalExpenditure > 0 && !duplicateVoucher;

  function updateHead(key, value) {
    setForm((current) => ({
      ...current,
      expenseHeads: {
        ...current.expenseHeads,
        [key]: value === "" ? "" : Math.max(0, Number(value || 0))
      }
    }));
  }

  function reset() {
    setForm((current) => ({
      ...current,
      particulars: "",
      voucherNumber: "",
      expenseHeads: blankExpenseHeads
    }));
    setEditingId("");
  }

  function addEntry() {
    if (!canAdd) return;
    const existing = state.expenditures.find((entry) => entry.id === editingId);
    const record = {
      id: editingId || crypto.randomUUID(),
      churchId: "bethel-sda",
      year: Number(form.year),
      quarter: form.quarter,
      quarterLabel: selectedQuarter?.label || form.quarter,
      date: form.date,
      month: new Date(form.date).getMonth() + 1,
      particulars: form.particulars.trim(),
      paidTo: "",
      voucherNumber: form.voucherNumber.trim(),
      paymentMode: "Cash",
      paymentReference: "",
      approvedBy: "",
      attachments: [],
      remarks: "",
      expenseHeads: Object.fromEntries(EXPENDITURE_ENTRY_FIELDS.map((field) => [field.key, toNumber(form.expenseHeads[field.key])])),
      totalExpenditure,
      status: "Active",
      auditStatus: existing?.auditStatus || "Draft",
      approvalStatus: existing?.approvalStatus || "Pending",
      createdBy: existing?.createdBy || user.name,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedBy: user.name,
      updatedAt: new Date().toISOString()
    };
    dispatch({
      type: editingId ? "UPDATE_EXPENDITURE" : "ADD_EXPENDITURE",
      payload: record,
      log: {
        user: user.name,
        role: user.role,
        action: editingId ? "Expenditure edit" : "New expenditure",
        recordType: "Expenditure",
        recordId: record.id,
        newValue: record.voucherNumber
      }
    });
    reset();
  }

  function editEntry(entry) {
    setEditingId(entry.id);
    setForm({
      year: entry.year,
      quarter: entry.quarter,
      date: entry.date,
      particulars: entry.particulars,
      voucherNumber: entry.voucherNumber,
      expenseHeads: { ...blankExpenseHeads, ...entry.expenseHeads }
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteEntry(entry) {
    if (!window.confirm(`Delete voucher ${entry.voucherNumber}?`)) return;
    dispatch({
      type: "DELETE_EXPENDITURE",
      payload: entry,
      log: {
        user: user.name,
        role: user.role,
        action: "Expenditure delete",
        recordType: "Expenditure",
        recordId: entry.id,
        previousValue: entry.voucherNumber
      }
    });
    if (editingId === entry.id) reset();
  }

  const tableRows = state.expenditures.map((entry) => ({
    ...entry,
    quarterDisplay: entry.quarterLabel || getQuarterLabel(state.settings.quarters, entry.month),
    dateDisplay: formatDate(entry.date),
    monthDisplay: MONTHS[(entry.month || new Date(entry.date).getMonth() + 1) - 1],
    totalDisplay: money(entry.totalExpenditure, state.settings.currencySymbol)
  }));

  const columns = [
    { key: "year", label: "Year" },
    { key: "quarterDisplay", label: "Quarter" },
    { key: "dateDisplay", label: "Date" },
    { key: "particulars", label: "Particulars" },
    { key: "voucherNumber", label: "Cash Voucher No." },
    ...EXPENDITURE_ENTRY_FIELDS.map((field) => ({
      key: field.key,
      label: field.label,
      render: (row) => moneyOrBlank(row.expenseHeads?.[field.key], state.settings.currencySymbol)
    })),
    { key: "totalDisplay", label: "Total" },
    { key: "createdBy", label: "Entered By" },
    {
      key: "actions",
      label: "Edit/Delete",
      render: (row) => (
        <div className="row-actions">
          <Button variant="ghost" onClick={() => editEntry(row)} aria-label={`Edit ${row.voucherNumber}`}>
            <Pencil size={16} />
          </Button>
          <Button variant="ghost" onClick={() => deleteEntry(row)} aria-label={`Delete ${row.voucherNumber}`}>
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="stack local-funds-page">
      <PageHeader title="Expenditure Entry" subtitle="Enter expenditure vouchers and keep a running table of saved entries." />

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
          <Field label="Particulars">
            <Input value={form.particulars} onChange={(event) => setForm({ ...form, particulars: event.target.value })} />
          </Field>
          <Field label="Cash Voucher No." error={duplicateVoucher ? "Cash Voucher No. must be unique." : ""}>
            <Input value={form.voucherNumber} onChange={(event) => setForm({ ...form, voucherNumber: event.target.value })} />
          </Field>
        </div>
      </section>

      <section className="form-card">
        <h2>Expense Amounts</h2>
        <div className="money-grid">
          {EXPENDITURE_ENTRY_FIELDS.map((field) => (
            <Field key={field.key} label={field.label}>
              <Input type="number" min="0" step="0.01" value={form.expenseHeads[field.key]} onChange={(event) => updateHead(field.key, event.target.value)} />
            </Field>
          ))}
        </div>
      </section>

      <section className="mini-summary-grid local-funds-summary local-funds-summary-single">
        <div className="mini-summary-card">
          <span>Total Expenditure</span>
          <strong>{money(totalExpenditure, state.settings.currencySymbol)}</strong>
        </div>
      </section>

      <div className="button-row">
        <Button disabled={!canAdd} onClick={addEntry}><Plus size={18} /> {editingId ? "Update" : "Add"}</Button>
        <Button variant="ghost" onClick={reset}><RotateCcw size={18} /> Reset</Button>
      </div>

      <section className="form-card local-funds-table-card">
        <h2>Entered Expenditures</h2>
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

function getQuarterLabel(quarters, month) {
  return quarters.find((quarter) => quarter.months.includes(Number(month)))?.label || "";
}
