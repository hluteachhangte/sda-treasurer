import { RotateCcw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/Button";
import { Field, Input, Select, Textarea } from "../components/Field";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
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

const blankLocal100 = Object.fromEntries(LOCAL_FUND_100_FIELDS.map((field) => [field.key, ""]));

export function OpeningBalanceSetup() {
  const { user } = useAuth();
  const { state, dispatch } = useData();
  const [form, setForm] = useState(() => buildForm(state));

  useEffect(() => {
    setForm(buildForm(state));
  }, [state.settings, state.localFund100Worksheet]);

  const summary = useMemo(() => {
    const local50 = toNumber(form.openingLocalBalance);
    const local100 = LOCAL_FUND_100_FIELDS.reduce((sum, field) => sum + toNumber(form.local100OpeningBalances[field.key]), 0);
    const cashBank = toNumber(form.cashOnHand) + toNumber(form.bankBalance);
    return {
      localFund: local50 + local100,
      missionFund: toNumber(form.openingMissionBalance),
      cashBank
    };
  }, [form]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateMoneyField(key, value) {
    setForm((current) => ({ ...current, [key]: value === "" ? "" : Math.max(0, Number(value || 0)) }));
  }

  function updateLocal100Field(key, value) {
    setForm((current) => ({
      ...current,
      local100OpeningBalances: {
        ...current.local100OpeningBalances,
        [key]: value === "" ? "" : Math.max(0, Number(value || 0))
      }
    }));
  }

  function resetForm() {
    setForm(buildForm(state));
  }

  function saveOpeningBalances() {
    const local100OpeningBalances = Object.fromEntries(
      Object.entries(form.local100OpeningBalances).map(([key, value]) => [key, value === "" ? "" : toNumber(value)])
    );

    dispatch({
      type: "UPDATE_OPENING_BALANCE_SETUP",
      payload: {
        settings: {
          openingLocalBalance: toNumber(form.openingLocalBalance),
          openingMissionBalance: toNumber(form.openingMissionBalance),
          openingBalanceSetup: {
            year: Number(form.year),
            startingQuarter: form.startingQuarter,
            startDate: form.startDate,
            cashOnHand: toNumber(form.cashOnHand),
            bankBalance: toNumber(form.bankBalance),
            notes: form.notes.trim()
          }
        },
        localFund100Worksheet: {
          openingBalances: local100OpeningBalances
        }
      },
      log: {
        user: user.name,
        role: user.role,
        action: "Opening balance setup update",
        recordType: "Opening Balance",
        recordId: `${form.year}-${form.startingQuarter}`,
        newValue: `Local ${money(summary.localFund, state.settings.currencySymbol)}, Mission ${money(summary.missionFund, state.settings.currencySymbol)}`
      }
    });
  }

  return (
    <div className="stack">
      <PageHeader title="Opening Balance Setup" subtitle="Enter carried-forward balances before using the app for the new period." />

      <section className="form-card">
        <h2>Starting Period</h2>
        <div className="form-grid">
          <Field label="Year">
            <Input type="number" value={form.year} onChange={(event) => updateField("year", event.target.value)} />
          </Field>
          <Field label="Starting Quarter">
            <Select value={form.startingQuarter} onChange={(event) => updateField("startingQuarter", event.target.value)}>
              {state.settings.quarters.map((quarter) => <option key={quarter.id} value={quarter.id}>{quarter.label}</option>)}
            </Select>
          </Field>
          <Field label="Start Date">
            <Input type="date" value={form.startDate} onChange={(event) => updateField("startDate", event.target.value)} />
          </Field>
        </div>
      </section>

      <section className="form-card">
        <h2>Local Fund Opening Balance</h2>
        <div className="money-grid">
          <Field label="50% Local Fund">
            <Input type="number" min="0" step="0.01" value={form.openingLocalBalance} onChange={(event) => updateMoneyField("openingLocalBalance", event.target.value)} />
          </Field>
          {LOCAL_FUND_100_FIELDS.map((field) => (
            <Field key={field.key} label={field.label}>
              <Input type="number" min="0" step="0.01" value={form.local100OpeningBalances[field.key]} onChange={(event) => updateLocal100Field(field.key, event.target.value)} />
            </Field>
          ))}
        </div>
      </section>

      <section className="form-card">
        <h2>Mission Fund Opening Balance</h2>
        <div className="money-grid">
          <Field label="Mission Fund Due">
            <Input type="number" min="0" step="0.01" value={form.openingMissionBalance} onChange={(event) => updateMoneyField("openingMissionBalance", event.target.value)} />
          </Field>
          <Field label="Cash on Hand">
            <Input type="number" min="0" step="0.01" value={form.cashOnHand} onChange={(event) => updateMoneyField("cashOnHand", event.target.value)} />
          </Field>
          <Field label="Bank Balance">
            <Input type="number" min="0" step="0.01" value={form.bankBalance} onChange={(event) => updateMoneyField("bankBalance", event.target.value)} />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
        </Field>
      </section>

      <section className="summary-grid">
        <div className="summary-card tone-green">
          <span>Opening Local Fund</span>
          <strong>{money(summary.localFund, state.settings.currencySymbol)}</strong>
        </div>
        <div className="summary-card tone-gold">
          <span>Opening Mission Fund Due</span>
          <strong>{money(summary.missionFund, state.settings.currencySymbol)}</strong>
        </div>
        <div className="summary-card tone-blue">
          <span>Cash and Bank</span>
          <strong>{money(summary.cashBank, state.settings.currencySymbol)}</strong>
        </div>
      </section>

      <div className="button-row">
        <Button onClick={saveOpeningBalances}><Save size={18} /> Save Opening Balances</Button>
        <Button variant="ghost" onClick={resetForm}><RotateCcw size={18} /> Reset</Button>
      </div>
    </div>
  );
}

function buildForm(state) {
  const setup = state.settings.openingBalanceSetup || {};
  return {
    year: setup.year || new Date().getFullYear(),
    startingQuarter: setup.startingQuarter || "Q3",
    startDate: setup.startDate || "",
    openingLocalBalance: state.settings.openingLocalBalance ?? "",
    openingMissionBalance: state.settings.openingMissionBalance ?? "",
    cashOnHand: setup.cashOnHand ?? "",
    bankBalance: setup.bankBalance ?? "",
    notes: setup.notes || "",
    local100OpeningBalances: {
      ...blankLocal100,
      ...(state.localFund100Worksheet?.openingBalances || {})
    }
  };
}
