import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../components/Button";
import { DataTable } from "../components/DataTable";
import { Field, Input, Select } from "../components/Field";
import { PageHeader } from "../components/PageHeader";
import { useData } from "../contexts/DataContext";
import { EXPENSE_HEADS, MONTHS, OFFERING_CATEGORIES } from "../data/constants";
import { buildMonthlySummary, money, toNumber } from "../utils/calculations";
import { downloadCsv, downloadExcel, downloadPdf } from "../utils/exporters";

export function MonthlyReports() {
  const { state } = useData();
  const now = new Date();
  const [filters, setFilters] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [active, setActive] = useState("shared");
  const summary = useMemo(() => buildMonthlySummary(state, filters), [state, filters]);
  const reports = buildReports(state, summary, filters);
  const report = reports.find((item) => item.id === active);

  function exportAllExcel() {
    downloadExcel(`monthly-report-${filters.year}-${filters.month}.xlsx`, Object.fromEntries(reports.map((item) => [item.title, item.rows.map((row) => Object.fromEntries(item.columns.map((col) => [col.label, col.render ? col.render(row, true) : row[col.key]])))])));
  }

  return (
    <div className="stack">
      <PageHeader title="Monthly Reports" subtitle="Generate printable monthly statements with PDF, Excel and CSV export." />
      <section className="filter-row">
        <Field label="Year"><Input type="number" value={filters.year} onChange={(e) => setFilters({ ...filters, year: Number(e.target.value) })} /></Field>
        <Field label="Month"><Select value={filters.month} onChange={(e) => setFilters({ ...filters, month: Number(e.target.value) })}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</Select></Field>
      </section>
      <div className="tabs">
        {reports.map((item) => <button key={item.id} className={item.id === active ? "active" : ""} onClick={() => setActive(item.id)}>{item.short}</button>)}
      </div>
      <section className="report-preview" id="monthly-report-print">
        <header>
          <h2>{state.settings.churchName}</h2>
          <p>{report.title} - {MONTHS[filters.month - 1]} {filters.year}</p>
        </header>
        <DataTable columns={report.columns} rows={report.rows} />
        <div className="report-totals">{report.totals.map((item) => <span key={item.label}>{item.label}: <strong>{item.value}</strong></span>)}</div>
        <footer className="signature-row"><span>Prepared By</span><span>Auditor Signature</span><span>Pastor or Elder Signature</span><span>Church Seal</span></footer>
      </section>
      <div className="button-row">
        <Button onClick={() => window.print()}><Printer size={18} /> Print</Button>
        <Button variant="secondary" onClick={() => downloadPdf({ title: report.title, subtitle: `${MONTHS[filters.month - 1]} ${filters.year}`, columns: report.columns.map((c) => c.label), rows: report.rows.map((row) => report.columns.map((col) => col.render ? col.render(row, true) : row[col.key])), totals: report.totals.map((item) => `${item.label}: ${item.value}`), settings: state.settings, orientation: report.landscape ? "landscape" : "portrait" })}><Download size={18} /> Download PDF</Button>
        <Button variant="secondary" onClick={exportAllExcel}><FileSpreadsheet size={18} /> Export Excel</Button>
        <Button variant="secondary" onClick={() => downloadCsv(`${report.id}.csv`, report.rows.map((row) => Object.fromEntries(report.columns.map((col) => [col.label, col.render ? col.render(row, true) : row[col.key]]))))}>Export CSV</Button>
      </div>
    </div>
  );
}

function amount(state, value, raw) {
  return raw ? toNumber(value) : money(value, state.settings.currencySymbol);
}

function buildReports(state, summary, filters) {
  const sharedCats = ["sabbathSchool", "birthdayThanks", "thirteenthSabbath", "divineService", "ay"];
  const localCats = ["childrensMinistries", "womensMinistries", "acs", "buildingFund", "internalMaintenance", "personalEvangelism", "others"];
  const offerings = summary.offerings;
  const expenditures = summary.expenditures;
  const remittance = summary.remittances[0] || {};

  return [
    {
      id: "shared",
      short: "50% Offering",
      title: "Monthly Statement of 50% Local and 50% Mission Offerings",
      landscape: true,
      rows: offerings,
      columns: [
        { key: "date", label: "Date" },
        { key: "receiptNumber", label: "Receipt Number" },
        ...sharedCats.map((key) => ({ key, label: OFFERING_CATEGORIES.find((cat) => cat.key === key).label, render: (row, raw) => amount(state, row.offerings?.[key], raw) })),
        { key: "sharedOfferingTotal", label: "Total Shared Offering", render: (row, raw) => amount(state, row.sharedOfferingTotal, raw) },
        { key: "localShare50", label: "50% Local Share", render: (row, raw) => amount(state, row.localShare50, raw) },
        { key: "fiftyPercentOffering", label: "50% Offering", render: (row, raw) => amount(state, row.fiftyPercentOffering, raw) }
      ],
      totals: [
        { label: "Total Shared Offerings", value: money(summary.sharedOfferingTotal, state.settings.currencySymbol) },
        { label: "Total 50% Local Share", value: money(summary.localShare50, state.settings.currencySymbol) },
        { label: "Total 50% Offering", value: money(summary.fiftyPercentOffering, state.settings.currencySymbol) },
        { label: "Number of receipts", value: summary.receiptCount }
      ]
    },
    {
      id: "local",
      short: "100% Local",
      title: "Monthly Statement of 100% Local Church Offerings",
      landscape: true,
      rows: offerings,
      columns: [
        { key: "date", label: "Date" },
        { key: "receiptNumber", label: "Receipt Number" },
        ...localCats.map((key) => ({ key, label: OFFERING_CATEGORIES.find((cat) => cat.key === key).label, render: (row, raw) => amount(state, row.offerings?.[key], raw) })),
        { key: "localFund100", label: "Total 100% Local Fund", render: (row, raw) => amount(state, row.localFund100, raw) }
      ],
      totals: [{ label: "Total 100% Local Fund", value: money(summary.localFund100, state.settings.currencySymbol) }, { label: "Number of receipts", value: summary.receiptCount }]
    },
    {
      id: "mission",
      short: "Mission Fund",
      title: "Monthly Mission Fund and Conference Remittance Statement",
      rows: offerings,
      columns: [
        { key: "date", label: "Date" },
        { key: "receiptNumber", label: "Receipt Number" },
        { key: "tithe", label: "Tithe", render: (row, raw) => amount(state, row.offerings?.tithe, raw) },
        { key: "investment", label: "Investment", render: (row, raw) => amount(state, row.offerings?.investment, raw) },
        { key: "fiftyPercentOffering", label: "50% Offering", render: (row, raw) => amount(state, row.fiftyPercentOffering, raw) },
        { key: "totalMissionFund", label: "Total Mission Fund", render: (row, raw) => amount(state, row.totalMissionFund, raw) }
      ],
      totals: [
        { label: "Total Tithe", value: money(summary.tithe, state.settings.currencySymbol) },
        { label: "Total Investment", value: money(summary.investment, state.settings.currencySymbol) },
        { label: "Total 50% Offering", value: money(summary.fiftyPercentOffering, state.settings.currencySymbol) },
        { label: "Total Mission Fund Received", value: money(summary.totalMissionFund, state.settings.currencySymbol) },
        { label: "Opening Mission Fund Balance", value: money(state.settings.openingMissionBalance, state.settings.currencySymbol) },
        { label: "Total Mission Fund Due", value: money(summary.missionFundDue, state.settings.currencySymbol) },
        { label: "Amount Remitted", value: money(summary.missionFundRemitted, state.settings.currencySymbol) },
        { label: "Pending Mission Fund", value: money(summary.missionFundPending, state.settings.currencySymbol) },
        { label: "Conference Receipt Number", value: remittance.conferenceReceiptNumber || "Pending" },
        { label: "Remittance Date", value: remittance.remittanceDate || "Pending" },
        { label: "Remittance Status", value: remittance.status || "Not Remitted" }
      ]
    },
    {
      id: "expenditure",
      short: "Expenditure",
      title: "Monthly Departmental Expenditure Statement",
      landscape: true,
      rows: expenditures,
      columns: [
        { key: "date", label: "Date" },
        { key: "voucherNumber", label: "Voucher Number" },
        { key: "particulars", label: "Particulars" },
        ...EXPENSE_HEADS.map((head) => ({ key: head.key, label: head.label, render: (row, raw) => amount(state, row.expenseHeads?.[head.key], raw) })),
        { key: "totalExpenditure", label: "Total Expenditure", render: (row, raw) => amount(state, row.totalExpenditure, raw) }
      ],
      totals: [{ label: "Total Expenditure", value: money(summary.totalExpenditure, state.settings.currencySymbol) }]
    },
    {
      id: "consolidated",
      short: "Consolidated",
      title: "Consolidated Monthly Treasurer's Report",
      rows: [
        { id: "opening-local", section: "Opening Balances", label: "Opening Local Fund Balance", value: state.settings.openingLocalBalance },
        { id: "opening-mission", section: "Opening Balances", label: "Opening Mission Fund Balance", value: state.settings.openingMissionBalance },
        { id: "local-share", section: "Local Fund Receipts", label: "Local Share from 50% Offerings", value: summary.localShare50 },
        { id: "local-100", section: "Local Fund Receipts", label: "100% Local Fund", value: summary.localFund100 },
        { id: "mission-total", section: "Mission Fund Receipts", label: "Total Mission Fund Received", value: summary.totalMissionFund },
        { id: "expense", section: "Payments", label: "Total Local Fund Expenditure", value: summary.totalExpenditure },
        { id: "remitted", section: "Payments", label: "Amount Remitted to Conference", value: summary.missionFundRemitted },
        { id: "closing-local", section: "Closing Balances", label: "Closing Local Fund Balance", value: summary.localFundBalance },
        { id: "closing-mission", section: "Closing Balances", label: "Closing Mission Fund Balance", value: summary.missionFundPending },
        { id: "gross", section: "Totals", label: "Gross Offering Collection", value: summary.grossOfferingTotal },
        { id: "payments", section: "Totals", label: "Total Payments", value: summary.totalExpenditure + summary.missionFundRemitted },
        { id: "cash", section: "Reconciliation", label: "Cash balance", value: 0 },
        { id: "bank", section: "Reconciliation", label: "Bank or UPI balance", value: 0 },
        { id: "difference", section: "Reconciliation", label: "Unreconciled difference", value: 0 }
      ],
      columns: [
        { key: "section", label: "Section" },
        { key: "label", label: "Item" },
        { key: "value", label: "Amount", render: (row, raw) => amount(state, row.value, raw) }
      ],
      totals: [{ label: "Cash balance", value: money(0, state.settings.currencySymbol) }, { label: "Bank or UPI balance", value: money(0, state.settings.currencySymbol) }]
    }
  ];
}
