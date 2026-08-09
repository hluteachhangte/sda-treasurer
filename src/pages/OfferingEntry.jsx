import { Printer, RotateCcw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/Button";
import { Field, Input, Textarea } from "../components/Field";
import { Modal } from "../components/Modal";
import { PageHeader } from "../components/PageHeader";
import { Receipt } from "../components/Receipt";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { DEFAULT_CHURCH_NAME, OFFERING_CATEGORIES } from "../data/constants";
import { buildMonthlySummary, calculateOfferingTotals, money, nextSequence, toNumber } from "../utils/calculations";
import { printElement } from "../utils/exporters";

const blankOfferings = Object.fromEntries(OFFERING_CATEGORIES.map((cat) => [cat.key, ""]));

export function OfferingEntry() {
  const { user } = useAuth();
  const { state, dispatch } = useData();
  const today = new Date().toISOString().slice(0, 10);
  const [saving, setSaving] = useState(false);
  const [savedRecord, setSavedRecord] = useState(null);
  const [form, setForm] = useState({
    churchName: DEFAULT_CHURCH_NAME,
    date: today,
    sabbathNumber: 1,
    receivedFrom: "Church Members",
    receiptNumber: nextSequence("BSC", state.offerings, "receiptNumber", new Date().getFullYear(), new Date().getMonth() + 1),
    paymentMode: "Cash",
    remarks: "",
    offerings: blankOfferings
  });
  const date = new Date(form.date);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const totals = useMemo(() => calculateOfferingTotals(form.offerings, state.settings.offeringCategories, state.settings.percentageAllocation), [form.offerings, state.settings]);
  const duplicateReceipt = state.offerings.some((item) => item.receiptNumber === form.receiptNumber && item.status !== "Cancelled");
  const duplicateDate = state.offerings.some((item) => item.date === form.date && item.status !== "Cancelled");
  const hasAmount = Object.values(form.offerings).some((value) => toNumber(value) > 0);

  useEffect(() => {
    const handler = (event) => {
      if (hasAmount && !savedRecord) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasAmount, savedRecord]);

  function updateOffering(key, value) {
    const next = Math.max(0, Number(value || 0));
    setForm((current) => ({ ...current, offerings: { ...current.offerings, [key]: value === "" ? "" : next } }));
  }

  function reset() {
    setForm({
      churchName: DEFAULT_CHURCH_NAME,
      date: today,
      sabbathNumber: 1,
      receivedFrom: "Church Members",
      receiptNumber: nextSequence("BSC", state.offerings, "receiptNumber", year, month),
      paymentMode: "Cash",
      remarks: "",
      offerings: blankOfferings
    });
    setSavedRecord(null);
  }

  async function save(printAfter = false) {
    if (saving || duplicateReceipt || !hasAmount || Math.abs(totals.grossOfferingTotal - (totals.totalLocalFund + totals.totalMissionFund)) > 0.01) return;
    setSaving(true);
    const record = {
      id: crypto.randomUUID(),
      churchId: "bethel-sda",
      ...form,
      year,
      month,
      status: "Active",
      auditStatus: "Draft",
      offerings: Object.fromEntries(Object.entries(form.offerings).map(([key, value]) => [key, toNumber(value)])),
      ...totals,
      createdBy: user.name,
      createdAt: new Date().toISOString(),
      updatedBy: user.name,
      updatedAt: new Date().toISOString()
    };
    dispatch({
      type: "ADD_OFFERING",
      payload: record,
      log: { user: user.name, role: user.role, action: "New offering entry", recordType: "Offering", recordId: record.id, newValue: record.receiptNumber }
    });
    setSavedRecord(record);
    setSaving(false);
    if (printAfter) setTimeout(() => printElement("receipt-print"), 100);
  }

  const balance = buildMonthlySummary(state, { year, month });

  return (
    <div className="stack">
      <PageHeader title="Sabbath Offering Entry" subtitle="Record weekly Sabbath offerings and review fund allocation before saving." />
      {duplicateDate && <div className="alert warning">An offering entry already exists for this Sabbath date.</div>}
      {!navigator.onLine && <div className="alert warning">Offline mode: save will remain in this browser until sync is available.</div>}
      <section className="form-card">
        <h2>General Information</h2>
        <div className="form-grid">
          <Field label="Name of Church"><Input value={form.churchName} onChange={(e) => setForm({ ...form, churchName: e.target.value })} /></Field>
          <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Year"><Input value={year} readOnly /></Field>
          <Field label="Month"><Input value={month} readOnly /></Field>
          <Field label="Sabbath number"><Input type="number" min="1" value={form.sabbathNumber} onChange={(e) => setForm({ ...form, sabbathNumber: e.target.value })} /></Field>
          <Field label="Received From"><Input value={form.receivedFrom} onChange={(e) => setForm({ ...form, receivedFrom: e.target.value })} /></Field>
          <Field label="Receipt Number" error={duplicateReceipt ? "Receipt number must be unique." : ""}><Input value={form.receiptNumber} onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })} /></Field>
        </div>
        <Field label="Remarks"><Textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></Field>
      </section>

      <section className="form-card">
        <h2>Offering Amount Fields</h2>
        <div className="money-grid">
          {OFFERING_CATEGORIES.map((cat) => (
            <Field key={cat.key} label={cat.label}>
              <Input type="number" min="0" step="0.01" value={form.offerings[cat.key]} onChange={(e) => updateOffering(cat.key, e.target.value)} />
            </Field>
          ))}
        </div>
      </section>

      <section className="calc-panel">
        <h2>Live Calculation Panel</h2>
        <dl>
          <Calc label="Shared Offering Total" value={totals.sharedOfferingTotal} settings={state.settings} />
          <Calc label="Local Share from 50% Offerings" value={totals.localShare50} settings={state.settings} />
          <Calc label="50% Offering" value={totals.fiftyPercentOffering} settings={state.settings} />
          <Calc label="100% Local Fund" value={totals.localFund100} settings={state.settings} />
          <Calc label="Direct Mission Fund" value={totals.directMissionFund} settings={state.settings} />
          <Calc label="Total Local Fund" value={totals.totalLocalFund} settings={state.settings} />
          <Calc label="Total Mission Fund" value={totals.totalMissionFund} settings={state.settings} />
          <Calc label="Gross Offering Total" value={totals.grossOfferingTotal} settings={state.settings} strong />
        </dl>
        <small>Current local fund balance before this entry: {money(balance.localFundBalance, state.settings.currencySymbol)}</small>
      </section>

      {!hasAmount && <div className="alert danger">At least one offering amount must be greater than zero.</div>}
      <div className="button-row">
        <Button disabled={saving || duplicateReceipt || !hasAmount} onClick={() => save(false)}><Save size={18} /> {saving ? "Saving..." : "Save Entry"}</Button>
        <Button disabled={saving || duplicateReceipt || !hasAmount} variant="secondary" onClick={() => save(true)}><Printer size={18} /> Save and Print Receipt</Button>
        <Button variant="ghost" onClick={reset}><RotateCcw size={18} /> Reset Form</Button>
      </div>

      {savedRecord && (
        <Modal title="Receipt" onClose={() => setSavedRecord(null)} wide>
          <Receipt record={savedRecord} settings={state.settings} />
          <div className="button-row">
            <Button onClick={() => printElement("receipt-print")}><Printer size={18} /> Print</Button>
            <Button variant="secondary" onClick={() => window.print()}>Download PDF</Button>
            <Button variant="ghost" onClick={() => navigator.share?.({ title: savedRecord.receiptNumber, text: `Receipt ${savedRecord.receiptNumber}` })}>Share</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Calc({ label, value, settings, strong }) {
  return (
    <>
      <dt>{label}</dt>
      <dd className={strong ? "strong" : ""}>{money(value, settings.currencySymbol)}</dd>
    </>
  );
}
