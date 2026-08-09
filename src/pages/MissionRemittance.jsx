import { Save } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../components/Button";
import { DataTable } from "../components/DataTable";
import { Field, Input, Select, Textarea } from "../components/Field";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { PAYMENT_MODES } from "../data/constants";
import { buildMonthlySummary, calculateRemittanceTotals, money } from "../utils/calculations";

export function MissionRemittance() {
  const { user } = useAuth();
  const { state, dispatch } = useData();
  const now = new Date();
  const [overrideReason, setOverrideReason] = useState("");
  const [form, setForm] = useState({
    year: now.getFullYear(),
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
  const monthSummary = buildMonthlySummary(state, { year: form.year, month: form.month });
  const values = {
    ...form,
    tithe: monthSummary.tithe,
    investment: monthSummary.investment,
    fiftyPercentOffering: monthSummary.fiftyPercentOffering
  };
  const totals = useMemo(() => calculateRemittanceTotals(values), [values]);
  const exceedsDue = Number(form.amountRemitted || 0) > totals.totalAmountDue;
  const canSave = Number(form.amountRemitted || 0) >= 0 && (!exceedsDue || overrideReason);

  function save() {
    if (!canSave) return;
    const record = {
      id: crypto.randomUUID(),
      ...values,
      ...totals,
      createdBy: user.name,
      createdAt: new Date().toISOString(),
      overrideReason
    };
    dispatch({ type: "ADD_REMITTANCE", payload: record, log: { user: user.name, role: user.role, action: "Remittance entry", recordType: "Remittance", recordId: record.id, newValue: record.conferenceReceiptNumber, reason: overrideReason } });
  }

  return (
    <div className="stack">
      <PageHeader title="Mission Remittance" subtitle="Record payments submitted to the Mizo Conference of Seventh-day Adventists." />
      <section className="form-card">
        <div className="form-grid">
          <Field label="Year"><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} /></Field>
          <Field label="Month"><Input type="number" min="1" max="12" value={form.month} onChange={(e) => setForm({ ...form, month: Number(e.target.value) })} /></Field>
          <Field label="Remittance date"><Input type="date" value={form.remittanceDate} onChange={(e) => setForm({ ...form, remittanceDate: e.target.value })} /></Field>
          <Field label="Opening Mission Fund balance"><Input type="number" min="0" value={form.openingMissionBalance} onChange={(e) => setForm({ ...form, openingMissionBalance: e.target.value })} /></Field>
          <Field label="Tithe received"><Input value={money(monthSummary.tithe, state.settings.currencySymbol)} readOnly /></Field>
          <Field label="Investment received"><Input value={money(monthSummary.investment, state.settings.currencySymbol)} readOnly /></Field>
          <Field label="50% Offering"><Input value={money(monthSummary.fiftyPercentOffering, state.settings.currencySymbol)} readOnly /></Field>
          <Field label="Total Mission Fund received"><Input value={money(totals.missionFundReceived, state.settings.currencySymbol)} readOnly /></Field>
          <Field label="Total amount due"><Input value={money(totals.totalAmountDue, state.settings.currencySymbol)} readOnly /></Field>
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
        <strong>{totals.status}</strong>
        <dl>
          <dt>Pending Mission Fund</dt>
          <dd>{money(totals.pendingMissionFund, state.settings.currencySymbol)}</dd>
        </dl>
      </section>
      {exceedsDue && <div className="alert warning">Amount remitted exceeds total amount due. Administrator override reason is required.<Input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Override reason" /></div>}
      <Button disabled={!canSave} onClick={save}><Save size={18} /> Save Remittance</Button>
      <DataTable
        rows={state.remittances}
        columns={[
          { key: "remittanceDate", label: "Date" },
          { key: "month", label: "Month" },
          { key: "totalAmountDue", label: "Due", render: (row) => money(row.totalAmountDue, state.settings.currencySymbol) },
          { key: "amountRemitted", label: "Remitted", render: (row) => money(row.amountRemitted, state.settings.currencySymbol) },
          { key: "pendingMissionFund", label: "Pending", render: (row) => money(row.pendingMissionFund, state.settings.currencySymbol) },
          { key: "conferenceReceiptNumber", label: "Conference Receipt" },
          { key: "status", label: "Status" }
        ]}
      />
    </div>
  );
}
