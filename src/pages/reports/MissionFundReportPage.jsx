import { Printer, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../components/Button";
import { Field, Select } from "../../components/Field";
import { PageHeader } from "../../components/PageHeader";
import { useData } from "../../contexts/DataContext";
import { MONTHS } from "../../data/constants";
import { money, toNumber } from "../../utils/calculations";
import "../../styles/fund-report.css";

const MISSION_FUND_FIELDS = [
  { key: "investment", label: "Investment" },
  { key: "tithe", label: "Tithe" },
  { key: "fiftyPercentFromLocalFunds", label: "50% from Local Fund" }
];

export function MissionFundReportPage() {
  const { state } = useData();
  const years = getAvailableYears(state.missionFundEntries);
  const defaultYear = getDefaultYear(years);
  const defaultQuarter = getDefaultQuarter(state.settings.quarters);
  const [filters, setFilters] = useState({ year: defaultYear, quarter: defaultQuarter, month: "all" });
  const quarterMonths = getQuarterMonths(state.settings.quarters, filters.quarter);
  const monthOptions = filters.quarter === "all" ? MONTHS.map((month, index) => ({ label: month, value: index + 1 })) : quarterMonths.map((month) => ({ label: MONTHS[month - 1], value: month }));
  const rows = useMemo(() => filterEntries(state.missionFundEntries, filters, state.settings.quarters), [state.missionFundEntries, filters, state.settings.quarters]);
  const totals = calculateTotals(rows);
  const period = getPeriodLabel(filters, state.settings.quarters);

  function updateQuarter(quarter) {
    setFilters((current) => {
      const months = getQuarterMonths(state.settings.quarters, quarter);
      if (quarter === "all" || current.month === "all" || months.includes(Number(current.month))) {
        return { ...current, quarter };
      }
      return { ...current, quarter, month: "all" };
    });
  }

  function resetFilters() {
    setFilters({ year: defaultYear, quarter: defaultQuarter, month: "all" });
  }

  return (
    <div className="fund-report-screen local-fund-book-screen">
      <PageHeader title="Mission Fund Report" subtitle="Treasurer's report book for mission fund entries." />

      <section className="fund-report-toolbar no-print">
        <div className="filter-row">
          <Field label="Year">
            <Select value={filters.year} onChange={(event) => setFilters({ ...filters, year: Number(event.target.value) })}>
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </Select>
          </Field>
          <Field label="Quarter">
            <Select value={filters.quarter} onChange={(event) => updateQuarter(event.target.value)}>
              <option value="all">All Quarters</option>
              {state.settings.quarters.map((quarter) => <option key={quarter.id} value={quarter.id}>{quarter.label}</option>)}
            </Select>
          </Field>
          <Field label="Month">
            <Select value={filters.month} onChange={(event) => setFilters({ ...filters, month: event.target.value })}>
              <option value="all">All Months</option>
              {monthOptions.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="fund-report-actions">
          <Button variant="secondary" disabled={!rows.length} onClick={() => window.print()}><Printer size={18} /> Print Report</Button>
          <Button variant="ghost" onClick={resetFilters}><RotateCcw size={18} /> Reset Filters</Button>
        </div>
      </section>

      <article className="local-fund-book-page" id="mission-fund-report-print">
        <header className="local-fund-book-heading">
          <h2>SDA MISSION FUND TREASURER'S REPORT BOOK</h2>
          <div className="local-fund-book-meta">
            <strong>Church: Bethel Church</strong>
            <strong>{period.label}: {period.value}</strong>
            <strong>Year: {filters.year}</strong>
          </div>
        </header>

        <div className="local-fund-book-table-wrap">
          <table className="local-fund-book-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Received From</th>
                <th>Receipt<br />No.</th>
                {MISSION_FUND_FIELDS.map((field) => <th key={field.key}>{field.label}</th>)}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDateDash(entry.date)}</td>
                  <td>{entry.receivedFrom}</td>
                  <td>{entry.receiptNo}</td>
                  {MISSION_FUND_FIELDS.map((field) => <td className="amount-cell" key={field.key}>{moneyOrBlank(entry.amounts?.[field.key], state.settings.currencySymbol)}</td>)}
                  <td className="amount-cell">{money(entry.totalAmount, state.settings.currencySymbol)}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td className="empty-book-row" colSpan={MISSION_FUND_FIELDS.length + 4}>No records found.</td>
                </tr>
              )}
              <tr className="book-total-row">
                <td colSpan={3}>Total</td>
                {MISSION_FUND_FIELDS.map((field) => <td className="amount-cell" key={field.key}>{moneyOrBlank(totals.fields[field.key], state.settings.currencySymbol)}</td>)}
                <td className="amount-cell">{moneyOrBlank(totals.grandTotal, state.settings.currencySymbol)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer className="local-fund-book-signature">
          <div className="signature-line" />
          <strong>Treasurer's Signature</strong>
        </footer>
      </article>
    </div>
  );
}

function filterEntries(entries = [], filters, quarters = []) {
  return (entries || [])
    .filter((entry) => {
      if (entry.status === "Cancelled" || entry.status === "Deleted") return false;
      if (Number(entry.year) !== Number(filters.year)) return false;
      const month = Number(entry.month || new Date(entry.date).getMonth() + 1);
      if (filters.month !== "all") return month === Number(filters.month);
      if (filters.quarter !== "all") {
        const quarter = quarters.find((item) => item.id === filters.quarter);
        return entry.quarter === filters.quarter || quarter?.months.includes(month);
      }
      return true;
    })
    .sort((left, right) => new Date(left.date) - new Date(right.date));
}

function calculateTotals(rows) {
  const fields = MISSION_FUND_FIELDS.reduce((totals, field) => {
    totals[field.key] = rows.reduce((sum, entry) => sum + toNumber(entry.amounts?.[field.key]), 0);
    return totals;
  }, {});
  return {
    fields,
    grandTotal: MISSION_FUND_FIELDS.reduce((sum, field) => sum + toNumber(fields[field.key]), 0)
  };
}

function getAvailableYears(entries = []) {
  const years = [...new Set((entries || []).map((entry) => Number(entry.year)).filter(Number.isFinite))].sort((a, b) => b - a);
  return years.length ? years : [new Date().getFullYear()];
}

function getDefaultYear(years) {
  const currentYear = new Date().getFullYear();
  return years.includes(currentYear) ? currentYear : years[0];
}

function getDefaultQuarter(quarters = []) {
  const month = new Date().getMonth() + 1;
  return quarters.find((quarter) => quarter.months.includes(month))?.id || "all";
}

function getQuarterMonths(quarters = [], quarterId) {
  return quarters.find((quarter) => quarter.id === quarterId)?.months || [];
}

function getPeriodLabel(filters, quarters = []) {
  if (filters.month !== "all") return { label: "Month", value: MONTHS[Number(filters.month) - 1] };
  if (filters.quarter !== "all") return { label: "Quarter", value: quarters.find((quarter) => quarter.id === filters.quarter)?.label || filters.quarter };
  return { label: "Month", value: "All Months" };
}

function formatDateDash(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

function moneyOrBlank(value, symbol) {
  return toNumber(value) === 0 ? "" : money(value, symbol);
}
