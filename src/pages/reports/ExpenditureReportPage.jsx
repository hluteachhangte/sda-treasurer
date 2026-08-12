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

const EXPENDITURE_REPORT_FIELDS = [
  { key: "ssDept", label: "S.S. Dept.", aliases: ["ssDept", "sabbathSchoolDepartment"] },
  { key: "churchExpense", label: "Church Expense", aliases: ["churchExpense"] },
  { key: "personalMinistries", label: "Personal/Evangelism", aliases: ["personalMinistries", "evangelism"] },
  { key: "ayExpense", label: "AY", aliases: ["ayExpense", "ay"] },
  { key: "children", label: "Children's Ministries", aliases: ["children"] },
  { key: "womenMinistries", label: "Women's Ministries", aliases: ["womenMinistries", "womensMinistries"] },
  { key: "acs", label: "ACS", aliases: ["acs"] },
  { key: "building", label: "Building", aliases: ["building", "buildingFund"] },
  { key: "others", label: "Others", aliases: ["others"] }
];

export function ExpenditureReportPage() {
  const { state } = useData();
  const years = getAvailableYears(state.expenditures);
  const defaultYear = getDefaultYear(years);
  const defaultQuarter = getDefaultQuarter(state.settings.quarters);
  const [filters, setFilters] = useState({ year: defaultYear, quarter: defaultQuarter, month: "all", fromDate: "", toDate: "" });
  const quarterMonths = getQuarterMonths(state.settings.quarters, filters.quarter);
  const monthOptions = filters.quarter === "all" ? MONTHS.map((month, index) => ({ label: month, value: index + 1 })) : quarterMonths.map((month) => ({ label: MONTHS[month - 1], value: month }));
  const rows = useMemo(() => filterEntries(state.expenditures, filters, state.settings.quarters), [state.expenditures, filters, state.settings.quarters]);
  const totals = calculateTotals(rows);
  const period = getPeriodLabel(filters, state.settings.quarters);
  const dateRangeLabel = getDateRangeLabel(filters);

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
      <PageHeader title="Expenditure Report" subtitle="Treasurer's report book for expenditure entries." />

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
          <Button variant="secondary" disabled={!rows.length} onClick={() => window.print()}><Printer size={18} /> Print Report</Button>
          <Button variant="ghost" onClick={resetFilters}><RotateCcw size={18} /> Reset Filters</Button>
        </div>
      </section>

      <article className="local-fund-book-page" id="expenditure-report-print">
        <header className="local-fund-book-heading">
          <h2>SDA EXPENDITURE TREASURER'S REPORT BOOK</h2>
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
                <th>Particulars</th>
                <th>Cash Voucher<br />No.</th>
                {EXPENDITURE_REPORT_FIELDS.map((field) => <th key={field.key}>{field.label}</th>)}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDateDash(entry.date)}</td>
                  <td>{entry.particulars}</td>
                  <td>{entry.voucherNumber}</td>
                  {EXPENDITURE_REPORT_FIELDS.map((field) => <td className="amount-cell" key={field.key}>{moneyOrBlank(readExpenseHead(entry.expenseHeads, field.aliases), state.settings.currencySymbol)}</td>)}
                  <td className="amount-cell">{moneyOrBlank(getEntryTotal(entry), state.settings.currencySymbol)}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td className="empty-book-row" colSpan={EXPENDITURE_REPORT_FIELDS.length + 4}>No records found.</td>
                </tr>
              )}
              <tr className="book-total-row">
                <td colSpan={3}>Total</td>
                {EXPENDITURE_REPORT_FIELDS.map((field) => <td className="amount-cell" key={field.key}>{moneyOrBlank(totals.fields[field.key], state.settings.currencySymbol)}</td>)}
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

function calculateTotals(rows) {
  const fields = EXPENDITURE_REPORT_FIELDS.reduce((totals, field) => {
    totals[field.key] = rows.reduce((sum, entry) => sum + readExpenseHead(entry.expenseHeads, field.aliases), 0);
    return totals;
  }, {});
  return {
    fields,
    grandTotal: rows.reduce((sum, entry) => sum + getEntryTotal(entry), 0)
  };
}

function getEntryTotal(entry) {
  return EXPENDITURE_REPORT_FIELDS.reduce((sum, field) => sum + readExpenseHead(entry.expenseHeads, field.aliases), 0);
}

function readExpenseHead(expenseHeads = {}, aliases = []) {
  return aliases.reduce((sum, alias) => sum + toNumber(expenseHeads?.[alias]), 0);
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

function moneyOrBlank(value, symbol) {
  return toNumber(value) === 0 ? "" : money(value, symbol);
}
