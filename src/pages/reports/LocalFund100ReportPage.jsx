import { Printer, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../components/Button";
import { Field, Input, Select } from "../../components/Field";
import { PageHeader } from "../../components/PageHeader";
import { useData } from "../../contexts/DataContext";
import { MONTHS } from "../../data/constants";
import { money, toNumber } from "../../utils/calculations";
import { formatDateDash, getDateRangeLabel, recordMatchesDateRange } from "../../utils/dateFilters";
import "../../styles/fund-report.css";

const LOCAL_FUND_100_FIELDS = [
  { key: "children", label: "Children" },
  { key: "personalEvangelism", label: "Personal/Evangelism" },
  { key: "ay", label: "AY" },
  { key: "womensMinistries", label: "Women Ministries" },
  { key: "acs", label: "ACS" },
  { key: "buildingFund", label: "Building" },
  { key: "others", label: "Others" }
];

const EXPENSE_ROLLUP_KEYS = {
  children: ["children"],
  personalEvangelism: ["personalEvangelism", "personalMinistries", "evangelism"],
  ay: ["ay", "ayExpense"],
  womensMinistries: ["womensMinistries", "womenMinistries"],
  acs: ["acs", "poorFund"],
  buildingFund: ["buildingFund", "building"],
  others: ["others", "ssDept", "churchExpense"]
};

export function LocalFund100ReportPage() {
  const { state } = useData();
  const years = getAvailableYears(state.localFund100Entries, state.expenditures);
  const defaultYear = getDefaultYear(years);
  const defaultQuarter = getDefaultQuarter(state.settings.quarters);
  const [filters, setFilters] = useState({ year: defaultYear, quarter: defaultQuarter, month: "all", fromDate: "", toDate: "" });
  const quarterMonths = getQuarterMonths(state.settings.quarters, filters.quarter);
  const monthOptions = filters.quarter === "all" ? MONTHS.map((month, index) => ({ label: month, value: index + 1 })) : quarterMonths.map((month) => ({ label: MONTHS[month - 1], value: month }));
  const rows = useMemo(() => filterEntries(state.localFund100Entries, filters, state.settings.quarters), [state.localFund100Entries, filters, state.settings.quarters]);
  const expenditureRows = useMemo(() => filterEntries(state.expenditures, filters, state.settings.quarters), [state.expenditures, filters, state.settings.quarters]);
  const worksheet = state.localFund100Worksheet || {};
  const reportTotals = calculateReportTotals(rows, worksheet, expenditureRows);
  const period = getPeriodLabel(filters, state.settings.quarters);
  const dateRangeLabel = getDateRangeLabel(filters);
  const hasReportData = rows.length > 0 || reportTotals.hasValues;

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
    setFilters({ year: defaultYear, quarter: defaultQuarter, month: "all", fromDate: "", toDate: "" });
  }

  return (
    <div className="fund-report-screen local-fund-book-screen">
      <PageHeader title="Local Fund (100%) Report" subtitle="Treasurer's report book for 100% local fund entries." />

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
          <Field label="From Date">
            <Input type="date" value={filters.fromDate} onChange={(event) => setFilters({ ...filters, fromDate: event.target.value })} />
          </Field>
          <Field label="To Date">
            <Input type="date" value={filters.toDate} onChange={(event) => setFilters({ ...filters, toDate: event.target.value })} />
          </Field>
        </div>
        <div className="fund-report-actions">
          <Button variant="secondary" disabled={!hasReportData} onClick={() => window.print()}><Printer size={18} /> Print Report</Button>
          <Button variant="ghost" onClick={resetFilters}><RotateCcw size={18} /> Reset Filters</Button>
        </div>
      </section>

      <article className="local-fund-book-page" id="local-fund-100-report-print">
        <header className="local-fund-book-heading">
          <h2>SDA LOCAL FUND TREASURER'S REPORT BOOK</h2>
          <div className="local-fund-book-meta">
            <strong>Church: Bethel Church</strong>
            <strong>{period.label}: {period.value}</strong>
            <strong>Year: {filters.year}</strong>
            {dateRangeLabel && <strong>Date: {dateRangeLabel}</strong>}
          </div>
        </header>

        <div className="local-fund-book-table-wrap">
          <table className="local-fund-book-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Received From</th>
                <th>Receipt<br />No.</th>
                {LOCAL_FUND_100_FIELDS.map((field) => <th key={field.key}>{field.label}</th>)}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDateDash(entry.date)}</td>
                  <td>{entry.receivedFrom}</td>
                  <td>{entry.receiptNo}</td>
                  {LOCAL_FUND_100_FIELDS.map((field) => <td className="amount-cell" key={field.key}>{moneyOrBlank(entry.amounts?.[field.key], state.settings.currencySymbol)}</td>)}
                  <td className="amount-cell">{money(entry.totalAmount, state.settings.currencySymbol)}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td className="empty-book-row" colSpan={LOCAL_FUND_100_FIELDS.length + 4}>No records found.</td>
                </tr>
              )}
              <SummaryRow label="Total" values={reportTotals.entered} total={reportTotals.enteredTotal} symbol={state.settings.currencySymbol} />
              <SummaryRow label="Opening Balance" values={reportTotals.opening} total={reportTotals.openingTotal} symbol={state.settings.currencySymbol} />
              <SummaryRow label="Total Income" values={reportTotals.income} total={reportTotals.incomeTotal} symbol={state.settings.currencySymbol} />
              <SummaryRow label="Expense" values={reportTotals.expense} total={reportTotals.expenseTotal} symbol={state.settings.currencySymbol} />
              <SummaryRow label="Total Balance" values={reportTotals.balance} total={reportTotals.balanceTotal} symbol={state.settings.currencySymbol} strong />
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

function SummaryRow({ label, values, total, symbol, strong = false }) {
  return (
    <tr className={strong ? "book-total-row book-balance-row" : "book-total-row"}>
      <td colSpan={3}>{label}</td>
      {LOCAL_FUND_100_FIELDS.map((field) => <td className="amount-cell" key={field.key}>{moneyOrBlank(values[field.key], symbol)}</td>)}
      <td className="amount-cell">{moneyOrBlank(total, symbol)}</td>
    </tr>
  );
}

function filterEntries(entries = [], filters, quarters = []) {
  return (entries || [])
    .filter((entry) => {
      if (entry.status === "Cancelled" || entry.status === "Deleted") return false;
      if (Number(entry.year) !== Number(filters.year)) return false;
      if (!recordMatchesDateRange(entry, filters)) return false;
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

function calculateReportTotals(rows, worksheet, expenditures = []) {
  const openingBalances = worksheet.openingBalances || {};
  const entered = LOCAL_FUND_100_FIELDS.reduce((totals, field) => {
    totals[field.key] = rows.reduce((sum, entry) => sum + toNumber(entry.amounts?.[field.key]), 0);
    return totals;
  }, {});
  const opening = LOCAL_FUND_100_FIELDS.reduce((totals, field) => {
    totals[field.key] = toNumber(openingBalances[field.key]);
    return totals;
  }, {});
  const expense = LOCAL_FUND_100_FIELDS.reduce((totals, field) => {
    totals[field.key] = expenditures.reduce((sum, entry) => sum + sumExpenseHeads(entry.expenseHeads, EXPENSE_ROLLUP_KEYS[field.key] || [field.key]), 0);
    return totals;
  }, {});
  const income = LOCAL_FUND_100_FIELDS.reduce((totals, field) => {
    totals[field.key] = toNumber(entered[field.key]) + toNumber(opening[field.key]);
    return totals;
  }, {});
  const balance = LOCAL_FUND_100_FIELDS.reduce((totals, field) => {
    totals[field.key] = toNumber(income[field.key]) - toNumber(expense[field.key]);
    return totals;
  }, {});

  return {
    entered,
    opening,
    income,
    expense,
    balance,
    enteredTotal: sumFieldValues(entered),
    openingTotal: sumFieldValues(opening),
    incomeTotal: sumFieldValues(income),
    expenseTotal: sumFieldValues(expense),
    balanceTotal: sumFieldValues(balance),
    hasValues: [entered, opening, expense].some((values) => sumFieldValues(values) > 0)
  };
}

function sumFieldValues(values) {
  return LOCAL_FUND_100_FIELDS.reduce((sum, field) => sum + toNumber(values[field.key]), 0);
}

function sumExpenseHeads(expenseHeads = {}, keys = []) {
  return keys.reduce((sum, key) => sum + toNumber(expenseHeads?.[key]), 0);
}

function getAvailableYears(entries = [], expenditures = []) {
  const years = [...new Set([...(entries || []), ...(expenditures || [])].map((entry) => Number(entry.year)).filter(Number.isFinite))].sort((a, b) => b - a);
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

function moneyOrBlank(value, symbol) {
  return toNumber(value) === 0 ? "" : money(value, symbol);
}
