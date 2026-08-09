import { Save } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/Button";
import { Field, Input, Select, Textarea } from "../components/Field";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";

export function SettingsPage() {
  const { user } = useAuth();
  const { state, dispatch } = useData();
  const [settings, setSettings] = useState(state.settings);

  function save() {
    dispatch({ type: "UPDATE_SETTINGS", payload: settings, log: { user: user.name, role: user.role, action: "Settings changed", recordType: "Settings", recordId: "settings", newValue: "Updated church settings" } });
  }

  function updateCategory(key, allocation) {
    setSettings((current) => ({
      ...current,
      offeringCategories: current.offeringCategories.map((cat) => cat.key === key ? { ...cat, allocation } : cat)
    }));
  }

  return (
    <div className="stack">
      <PageHeader title="Settings" subtitle="Church profile, reporting defaults, opening balances and fund classification rules." actions={<Button onClick={save}><Save size={18} /> Save Settings</Button>} />
      <section className="form-card">
        <h2>Church and Report Information</h2>
        <div className="form-grid">
          <Field label="Church name"><Input value={settings.churchName} onChange={(e) => setSettings({ ...settings, churchName: e.target.value })} /></Field>
          <Field label="Conference name"><Input value={settings.conferenceName} onChange={(e) => setSettings({ ...settings, conferenceName: e.target.value })} /></Field>
          <Field label="Treasurer name"><Input value={settings.treasurerName} onChange={(e) => setSettings({ ...settings, treasurerName: e.target.value })} /></Field>
          <Field label="Pastor or Elder name"><Input value={settings.pastorName} onChange={(e) => setSettings({ ...settings, pastorName: e.target.value })} /></Field>
          <Field label="Auditor name"><Input value={settings.auditorName} onChange={(e) => setSettings({ ...settings, auditorName: e.target.value })} /></Field>
          <Field label="Currency"><Input value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} /></Field>
          <Field label="Currency symbol"><Input value={settings.currencySymbol} onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })} /></Field>
          <Field label="Financial year start month"><Input type="number" min="1" max="12" value={settings.financialYearStartMonth} onChange={(e) => setSettings({ ...settings, financialYearStartMonth: Number(e.target.value) })} /></Field>
          <Field label="Receipt number format"><Input value={settings.receiptFormat} onChange={(e) => setSettings({ ...settings, receiptFormat: e.target.value })} /></Field>
          <Field label="Voucher number format"><Input value={settings.voucherFormat} onChange={(e) => setSettings({ ...settings, voucherFormat: e.target.value })} /></Field>
          <Field label="Opening Local Fund balance"><Input type="number" min="0" value={settings.openingLocalBalance} onChange={(e) => setSettings({ ...settings, openingLocalBalance: Number(e.target.value) })} /></Field>
          <Field label="Opening Mission Fund balance"><Input type="number" min="0" value={settings.openingMissionBalance} onChange={(e) => setSettings({ ...settings, openingMissionBalance: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Church address"><Textarea value={settings.churchAddress} onChange={(e) => setSettings({ ...settings, churchAddress: e.target.value })} /></Field>
        <Field label="PDF header and footer"><Textarea value={settings.pdfFooter} onChange={(e) => setSettings({ ...settings, pdfFooter: e.target.value })} /></Field>
      </section>
      <section className="form-card">
        <h2>Offering Categories and Fund Classifications</h2>
        <div className="settings-list">
          {settings.offeringCategories.map((cat) => (
            <div key={cat.key} className="settings-row">
              <span>{cat.label}</span>
              <Select value={cat.allocation} disabled={!cat.configurable && ["internalMaintenance", "personalEvangelism"].includes(cat.key) === false} onChange={(e) => updateCategory(cat.key, e.target.value)}>
                <option value="shared50">50% Local / 50% Mission</option>
                <option value="local100">100% Local Fund</option>
                <option value="mission100">Direct Mission Fund</option>
              </Select>
            </div>
          ))}
        </div>
        <Field label="Percentage allocation for shared offerings"><Input type="number" min="0" max="100" value={settings.percentageAllocation} onChange={(e) => setSettings({ ...settings, percentageAllocation: Number(e.target.value) })} /></Field>
      </section>
    </div>
  );
}
