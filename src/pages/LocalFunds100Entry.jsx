import { Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/Button";
import { DataTable } from "../components/DataTable";
import { Field, Input, Select } from "../components/Field";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { MONTHS } from "../data/constants";
import { money, toNumber } from "../utils/calculations";

const LOCAL_FUND_100_FIELDS = [
  { key: "children", label: "Children" },
  { key: "personalEvangelism", label: "Personal/Evangelism" },
  { key: "ay", label: "A.Y." },
  { key: "womensMinistries", label: "Women's Ministries" },
  { key: "acs", label: "A.C.S." },
  { key: "buildingFund", label: "Building" },
  { key: "others", label: "Others" }
];

const EXPENSE_FIELDS = [
  { key: "ssDept", label: "S.S. Dept." },
  { key: "churchExpense", label: "Church Expense" },
  { key: "personalMinistries", label: "Personal/Evangelism" },
  { key: "ayExpense", label: "AY" },
  { key: "womenMinistries", label: "Women's Ministries" },
  { key: "acs", label: "ACS" },
  { key: "building", label: "Building" },
  { key: "others", label: "Others" }
];

const EXPENSE_ROLLUP_KEYS = {
  children: ["children"],
  acs: ["acs", "poorFund"],
  personalEvangelism: ["personalEvangelism", "personalMinistries", "evangelism"],
  womensMinistries: ["womensMinistries", "womenMinistries"],
  ay: ["ay", "ayExpense"],
  buildingFund: ["buildingFund", "building"],
  others: ["others", "ssDept", "churchExpense"]
};

const blankAmounts = Object.fromEntries(LOCAL_FUND_100_FIELDS.map((field) => [field.key, ""]));
const blankExpenseAmounts = Object.fromEntries(EXPENSE_FIELDS.map((field) => [field.key, ""]));

export function LocalFunds100Entry() {
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

  const entries = state.localFund100Entries || [];
  const worksheet = state.localFund100Worksheet || {};
  const openingBalances = { ...blankAmounts, ...(worksheet.openingBalances || {}) };
  const expenses = useMemo(
    () => calculateExpenditureExpenseTotals(state.expenditures, form.year, form.quarter, state.settings.quarters),
    [state.expenditures, form.year, form.quarter, state.settings.quarters]
  );
  const [openingBalanceDraft, setOpeningBalanceDraft] = useState(openingBalances);
  const expenseRollup = rollupExpenses(expenses);
  const selectedQuarter = state.settings.quarters.find((quarter) => quarter.id === form.quarter) || state.settings.quarters[0];
  const duplicateReceipt = entries.some((entry) => entry.id !== editingId && entry.receiptNo === form.receiptNo && form.receiptNo.trim());
  const totalAmount = useMemo(
    () => LOCAL_FUND_100_FIELDS.reduce((total, field) => total + toNumber(form.amounts[field.key]), 0),
    [form.amounts]
  );
  const enteredTotals = useMemo(
    () =>
      LOCAL_FUND_100_FIELDS.reduce((totals, field) => {
        totals[field.key] = entries.reduce((sum, entry) => sum + toNumber(entry.amounts?.[field.key]), 0);
        return totals;
      }, {}),
    [entries]
  );
  const totalEntered = LOCAL_FUND_100_FIELDS.reduce((sum, field) => sum + toNumber(enteredTotals[field.key]), 0);
  const totalIncome = LOCAL_FUND_100_FIELDS.reduce(
    (totals, field) => {
      totals.byField[field.key] = toNumber(enteredTotals[field.key]) + toNumber(openingBalances[field.key]);
      totals.total += totals.byField[field.key];
      return totals;
    },
    { byField: {}, total: 0 }
  );
  const totalExpenses = LOCAL_FUND_100_FIELDS.reduce((sum, field) => sum + toNumber(expenseRollup[field.key]), 0);
  const totalBalance = LOCAL_FUND_100_FIELDS.reduce(
    (totals, field) => {
      totals.byField[field.key] = toNumber(totalIncome.byField[field.key]) - toNumber(expenseRollup[field.key]);
      totals.total += totals.byField[field.key];
      return totals;
    },
    { byField: {}, total: 0 }
  );
  const canAdd = form.year && form.quarter && form.date && form.receivedFrom.trim() && form.receiptNo.trim() && totalAmount > 0 && !duplicateReceipt;

  useEffect(() => {
    setOpeningBalanceDraft({ ...blankAmounts, ...(worksheet.openingBalances || {}) });
  }, [worksheet.openingBalances]);

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

  function updateOpeningBalanceDraft(key, value) {
    setOpeningBalanceDraft((current) => ({
      ...current,
      [key]: value === "" ? "" : Math.max(0, Number(value || 0))
    }));
  }

  function saveOpeningBalances() {
    dispatch({
      type: "UPDATE_LOCAL_FUND_100_WORKSHEET",
      payload: {
        openingBalances: Object.fromEntries(
          Object.entries(openingBalanceDraft).map(([key, value]) => [key, value === "" ? "" : toNumber(value)])
        )
      }
    });
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
      type: editingId ? "UPDATE_LOCAL_FUND_100_ENTRY" : "ADD_LOCAL_FUND_100_ENTRY",
      payload: record,
      log: {
        user: user.name,
        role: user.role,
        action: editingId ? "Local fund 100% entry edit" : "New local fund 100% entry",
        recordType: "Local Fund 100%",
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
      type: "DELETE_LOCAL_FUND_100_ENTRY",
      payload: entry,
      log: {
        user: user.name,
        role: user.role,
        action: "Local fund 100% entry delete",
        recordType: "Local Fund 100%",
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
    ...LOCAL_FUND_100_FIELDS.map((field) => ({
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
      <PageHeader title="Local Fund (100%) Entry" subtitle="Enter 100% local fund receipts and keep a running table of saved entries." />

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
          {LOCAL_FUND_100_FIELDS.map((field) => (
            <Field key={field.key} label={field.label}>
              <Input type="number" min="0" step="0.01" value={form.amounts[field.key]} onChange={(event) => updateAmount(field.key, event.target.value)} />
            </Field>
          ))}
        </div>
      </section>

      <div className="button-row">
        <Button disabled={!canAdd} onClick={addEntry}><Plus size={18} /> {editingId ? "Update" : "Add"}</Button>
        <Button variant="ghost" onClick={resetForm}><RotateCcw size={18} /> Reset</Button>
      </div>

      <section className="form-card local-funds-table-card">
        <h2>Entered Local Funds (100%)</h2>
        <DataTable columns={columns} rows={tableRows} />
        <FundSummaryRow
          title="Total Local Funds (100%)"
          fields={LOCAL_FUND_100_FIELDS}
          values={enteredTotals}
          total={totalEntered}
          symbol={state.settings.currencySymbol}
        />
      </section>

      <section className="form-card">
        <h2>Opening Balance</h2>
        <div className="money-grid">
          {LOCAL_FUND_100_FIELDS.map((field) => (
            <Field key={field.key} label={field.label}>
              <Input type="number" min="0" step="0.01" value={openingBalanceDraft[field.key]} onChange={(event) => updateOpeningBalanceDraft(field.key, event.target.value)} />
            </Field>
          ))}
        </div>
        <div className="button-row">
          <Button onClick={saveOpeningBalances}><Plus size={18} /> Add/Update</Button>
        </div>
      </section>

      <FundSummaryRow
        title="Total Income"
        fields={LOCAL_FUND_100_FIELDS}
        values={totalIncome.byField}
        total={totalIncome.total}
        symbol={state.settings.currencySymbol}
      />

      <section className="form-card">
        <h2>Expense</h2>
        <div className="money-grid">
          {EXPENSE_FIELDS.map((field) => (
            <Field key={field.key} label={field.label}>
              <Input type="number" min="0" step="0.01" value={expenses[field.key] || ""} disabled />
            </Field>
          ))}
        </div>
      </section>

      <FundSummaryRow
        title="Total Balance"
        fields={LOCAL_FUND_100_FIELDS}
        values={totalBalance.byField}
        total={totalBalance.total}
        symbol={state.settings.currencySymbol}
      />
    </div>
  );
}

function FundSummaryRow({ title, fields, values, total, symbol }) {
  return (
    <section className="fund-rollup-row">
      <div className="mini-summary-card rollup-total-card">
        <span>{title}</span>
        <strong>{money(total, symbol)}</strong>
      </div>
      {fields.map((field) => (
        <div className="mini-summary-card" key={field.key}>
          <span>{field.label}</span>
          <strong>{money(values[field.key], symbol)}</strong>
        </div>
      ))}
    </section>
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

function rollupExpenses(expenses = {}) {
  return LOCAL_FUND_100_FIELDS.reduce((totals, field) => {
    totals[field.key] = (EXPENSE_ROLLUP_KEYS[field.key] || [field.key]).reduce((sum, key) => sum + toNumber(expenses[key]), 0);
    return totals;
  }, {});
}

function calculateExpenditureExpenseTotals(expenditures = [], year, quarterId, quarters = []) {
  return EXPENSE_FIELDS.reduce((totals, field) => {
    totals[field.key] = (expenditures || [])
      .filter((entry) => entry.status !== "Cancelled" && entry.status !== "Deleted")
      .filter((entry) => Number(entry.year) === Number(year))
      .filter((entry) => {
        if (!quarterId) return true;
        const month = Number(entry.month || new Date(entry.date).getMonth() + 1);
        const quarter = quarters.find((item) => item.id === quarterId);
        return entry.quarter === quarterId || quarter?.months.includes(month);
      })
      .reduce((sum, entry) => sum + readExpenseHead(entry.expenseHeads, field.key), 0);
    return totals;
  }, { ...blankExpenseAmounts });
}

function readExpenseHead(expenseHeads = {}, key) {
  const aliases = {
    ssDept: ["ssDept", "sabbathSchoolDepartment"],
    personalMinistries: ["personalMinistries", "evangelism"],
    ayExpense: ["ayExpense", "ay"],
    womenMinistries: ["womenMinistries", "womensMinistries"],
    acs: ["acs", "poorFund"]
  };
  return (aliases[key] || [key]).reduce((sum, alias) => sum + toNumber(expenseHeads?.[alias]), 0);
}
