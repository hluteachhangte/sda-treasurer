import { Pencil, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../components/Button";
import { DataTable } from "../components/DataTable";
import { Field, Input, Select, Textarea } from "../components/Field";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { MONTHS, PAYMENT_MODES } from "../data/constants";
import { calculateRemittanceTotals, money, toNumber } from "../utils/calculations";
import { filterEntryRecords } from "../utils/fundReportCalculations";

export function MissionRemittance() {
  const { user } = useAuth();
  const { state, dispatch } = useData();
  const now = new Date();
  const [overrideReason, setOverrideReason] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({
    year: now.getFullYear(),
    quarter: state.settings.quarters.find((quarter) => quarter.months.includes(now.getMonth() + 1))?.id || state.settings.quarters[0]?.id || "Q1",
    month: now.getMonth() + 1,
    remittanceDate: now.toISOString().slice(0, 10),
    openingMissionBalance: state.settings.openingMissionBalance,
    amountRemitted: "",
    conferenceReceiptNumber: "",
    paymentMode: "Bank Transfer",
    transactionReference: "",
    attachment: "",
    remarks: ""
  });
  const filters = { year: form.year, quarter: form.quarter, month: form.month };
  const selectedQuarter = state.settings.quarters.find((quarter) => quarter.id === form.quarter);
  const availableMonths = selectedQuarter?.months || [];
  const missionEntries = useMemo(
    () => filterEntryRecords(state.missionFundEntries || [], filters),
    [state.missionFundEntries, filters.year, filters.quarter, filters.month]
  );
  const previousRemitted = useMemo(
    () => filterEntryRecords(state.remittances || [], filters)
      .filter((item) => item.id !== editingId)
      .reduce((sum, item) => sum + toNumber(item.amountRemitted), 0),
    [state.remittances, filters.year, filters.quarter, filters.month, editingId]
  );
  const missionSummary = useMemo(
    () => missionEntries.reduce(
      (totals, entry) => {
        totals.tithe += toNumber(entry.amounts?.tithe);
        totals.investment += toNumber(entry.amounts?.investment);
        totals.fiftyPercentOffering += toNumber(entry.amounts?.fiftyPercentFromLocalFunds);
        return totals;
      },
      { tithe: 0, investment: 0, fiftyPercentOffering: 0 }
    ),
    [missionEntries]
  );
  const values = {
    ...form,
    tithe: missionSummary.tithe,
    investment: missionSummary.investment,
    fiftyPercentOffering: missionSummary.fiftyPercentOffering
  };
  const totals = useMemo(() => calculateRemittanceTotals(values), [values]);
  const pendingBefore = Math.max(totals.totalAmountDue - previousRemitted, 0);
  const pendingAfter = pendingBefore - toNumber(form.amountRemitted);
  const exceedsDue = toNumber(form.amountRemitted) > pendingBefore;
  const canSave = form.remittanceDate && toNumber(form.amountRemitted) > 0 && (!exceedsDue || overrideReason);

  function save() {
    if (!canSave) return;
    const existing = state.remittances.find((item) => item.id === editingId);
    const record = {
      id: editingId || crypto.randomUUID(),
      ...values,
      ...totals,
      quarter: form.quarter,
      quarterLabel: selectedQuarter?.label || form.quarter,
      amountRemitted: toNumber(form.amountRemitted),
      previousRemitted,
      pendingMissionFund: pendingAfter,
      status: toNumber(form.amountRemitted) <= 0 ? "Not Remitted" : pendingAfter <= 0 ? "Fully Remitted" : "Partially Remitted",
      createdBy: existing?.createdBy || user.name,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedBy: user.name,
      updatedAt: new Date().toISOString(),
      overrideReason
    };
    dispatch({
      type: editingId ? "UPDATE_REMITTANCE" : "ADD_REMITTANCE",
      payload: record,
      log: {
        user: user.name,
        role: user.role,
        action: editingId ? "Remittance edit" : "Remittance entry",
        recordType: "Remittance",
        recordId: record.id,
        previousValue: existing?.conferenceReceiptNumber || "",
        newValue: record.conferenceReceiptNumber,
        reason: overrideReason
      }
    });
    setForm((current) => ({
      ...current,
      amountRemitted: "",
      conferenceReceiptNumber: "",
      transactionReference: "",
      attachment: "",
      remarks: ""
    }));
    setEditingId("");
    setOverrideReason("");
  }

  function editEntry(entry) {
    setEditingId(entry.id);
    setForm({
      year: Number(entry.year) || now.getFullYear(),
      quarter: entry.quarter || state.settings.quarters.find((quarter) => quarter.months.includes(Number(entry.month)))?.id || state.settings.quarters[0]?.id || "Q1",
      month: Number(entry.month) || now.getMonth() + 1,
      remittanceDate: entry.remittanceDate || now.toISOString().slice(0, 10),
      openingMissionBalance: entry.openingMissionBalance ?? state.settings.openingMissionBalance,
      amountRemitted: entry.amountRemitted ?? "",
      conferenceReceiptNumber: entry.conferenceReceiptNumber || "",
      paymentMode: entry.paymentMode || "Bank Transfer",
      transactionReference: entry.transactionReference || "",
      attachment: entry.attachment || "",
      remarks: entry.remarks || ""
    });
    setOverrideReason(entry.overrideReason || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteEntry(entry) {
    if (!window.confirm(`Delete remittance ${entry.conferenceReceiptNumber || formatDate(entry.remittanceDate)}?`)) return;
    dispatch({
      type: "DELETE_REMITTANCE",
      payload: entry,
      log: {
        user: user.name,
        role: user.role,
        action: "Remittance delete",
        recordType: "Remittance",
        recordId: entry.id,
        previousValue: entry.conferenceReceiptNumber || formatDate(entry.remittanceDate)
      }
    });
    if (editingId === entry.id) {
      setEditingId("");
      setOverrideReason("");
    }
  }

  return (
    <div className="stack">
      <PageHeader title="Mission Remittance" subtitle="Record payments submitted to the Mizo Conference of Seventh-day Adventists." />
      <section className="form-card">
        <div className="form-grid">
          <Field label="Year"><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} /></Field>
          <Field label="Quarter">
            <Select
              value={form.quarter}
              onChange={(e) => {
                const quarter = state.settings.quarters.find((item) => item.id === e.target.value);
                setForm({ ...form, quarter: e.target.value, month: quarter?.months?.[0] || form.month });
              }}
            >
              {state.settings.quarters.map((quarter) => <option key={quarter.id} value={quarter.id}>{quarter.label}</option>)}
            </Select>
          </Field>
          <Field label="Month">
            <Select value={form.month} onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}>
              {availableMonths.map((month) => <option key={month} value={month}>{MONTHS[month - 1]}</option>)}
            </Select>
          </Field>
          <Field label="Remittance date"><Input type="date" value={form.remittanceDate} onChange={(e) => setForm({ ...form, remittanceDate: e.target.value })} /></Field>
          <Field label="Opening Mission Fund balance"><Input type="number" min="0" value={form.openingMissionBalance} onChange={(e) => setForm({ ...form, openingMissionBalance: e.target.value })} /></Field>
          <Field label="Tithe received"><Input value={money(missionSummary.tithe, state.settings.currencySymbol)} readOnly /></Field>
          <Field label="Investment received"><Input value={money(missionSummary.investment, state.settings.currencySymbol)} readOnly /></Field>
          <Field label="50% from Local Fund"><Input value={money(missionSummary.fiftyPercentOffering, state.settings.currencySymbol)} readOnly /></Field>
          <Field label="Total Mission Fund received"><Input value={money(totals.missionFundReceived, state.settings.currencySymbol)} readOnly /></Field>
          <Field label="Total amount due"><Input value={money(totals.totalAmountDue, state.settings.currencySymbol)} readOnly /></Field>
          <Field label="Already remitted"><Input value={money(previousRemitted, state.settings.currencySymbol)} readOnly /></Field>
          <Field label="Pending before this remittance"><Input value={money(pendingBefore, state.settings.currencySymbol)} readOnly /></Field>
          <Field label="Amount remitted"><Input type="number" min="0" value={form.amountRemitted} onChange={(e) => setForm({ ...form, amountRemitted: e.target.value })} /></Field>
          <Field label="Conference receipt number"><Input value={form.conferenceReceiptNumber} onChange={(e) => setForm({ ...form, conferenceReceiptNumber: e.target.value })} /></Field>
          <Field label="Payment mode"><Select value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}>{PAYMENT_MODES.map((mode) => <option key={mode}>{mode}</option>)}</Select></Field>
          <Field label="Transaction reference"><Input value={form.transactionReference} onChange={(e) => setForm({ ...form, transactionReference: e.target.value })} /></Field>
          <Field label="Receipt attachment"><Input type="file" onChange={(e) => setForm({ ...form, attachment: e.target.files?.[0]?.name || "" })} /></Field>
        </div>
        <Field label="Remarks"><Textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></Field>
      </section>
      <section className="calc-panel">
        <h2>Remittance Status</h2>
        <strong>{toNumber(form.amountRemitted) <= 0 ? "Not Remitted" : pendingAfter <= 0 ? "Fully Remitted" : "Partially Remitted"}</strong>
        <dl>
          <dt>Pending Mission Fund</dt>
          <dd>{money(Math.max(pendingAfter, 0), state.settings.currencySymbol)}</dd>
          <dt>Mission Fund entries included</dt>
          <dd>{missionEntries.length}</dd>
        </dl>
      </section>
      {exceedsDue && <div className="alert warning">Amount remitted exceeds total amount due. Administrator override reason is required.<Input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Override reason" /></div>}
      <Button disabled={!canSave} onClick={save}><Save size={18} /> {editingId ? "Update Remittance" : "Save Remittance"}</Button>
      <DataTable
        rows={state.remittances}
        columns={[
          { key: "remittanceDate", label: "Date", render: (row) => formatDate(row.remittanceDate) },
          { key: "quarterLabel", label: "Quarter", render: (row) => row.quarterLabel || row.quarter || "" },
          { key: "month", label: "Month", render: (row) => MONTHS[Number(row.month) - 1] || row.month },
          { key: "totalAmountDue", label: "Due", render: (row) => money(row.totalAmountDue, state.settings.currencySymbol) },
          { key: "amountRemitted", label: "Remitted", render: (row) => money(row.amountRemitted, state.settings.currencySymbol) },
          { key: "pendingMissionFund", label: "Pending", render: (row) => money(Math.max(toNumber(row.pendingMissionFund), 0), state.settings.currencySymbol) },
          { key: "conferenceReceiptNumber", label: "Conference Receipt" },
          { key: "status", label: "Status" },
          {
            key: "actions",
            label: "Edit/Delete",
            render: (row) => (
              <div className="row-actions">
                <Button variant="ghost" onClick={() => editEntry(row)} aria-label={`Edit ${row.conferenceReceiptNumber || row.remittanceDate}`}>
                  <Pencil size={16} />
                </Button>
                <Button variant="ghost" onClick={() => deleteEntry(row)} aria-label={`Delete ${row.conferenceReceiptNumber || row.remittanceDate}`}>
                  <Trash2 size={16} />
                </Button>
              </div>
            )
          }
        ]}
      />
    </div>
  );
}

function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
