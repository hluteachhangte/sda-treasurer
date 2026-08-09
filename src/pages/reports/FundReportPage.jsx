import { Download, Printer, RefreshCcw, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../components/Button";
import { Field, Select } from "../../components/Field";
import { PageHeader } from "../../components/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { useData } from "../../contexts/DataContext";
import { MONTHS } from "../../data/constants";
import {
  buildFundReportFromState,
  formatINR,
  getFundReportYears,
  quarterMonths
} from "../../utils/fundReportCalculations";
import { downloadFundReportPdf } from "../../utils/fundReportPdf";
import "../../styles/fund-report.css";

const QUARTERS = [
  { id: "all", label: "All Quarters" },
  { id: "Q1", label: "1st Quarter" },
  { id: "Q2", label: "2nd Quarter" },
  { id: "Q3", label: "3rd Quarter" },
  { id: "Q4", label: "4th Quarter" }
];

export function FundReportPage() {
  const { state } = useData();
  const { user } = useAuth();
  const years = getFundReportYears(state);
  const defaultYear = getDefaultYear(years);
  const [filters, setFilters] = useState({ year: defaultYear, quarter: "all", month: "all" });
  const [refreshKey, setRefreshKey] = useState(0);
  const report = useMemo(() => buildFundReportFromState(state, filters), [state, filters, refreshKey]);
  const summary = report.summary;
  const period = getReportPeriod(filters);
  const generatedDate = new Date().toLocaleDateString("en-IN");
  const hasData = report.recordCount > 0;

  if (!summary.validation.ok && import.meta.env.DEV) {
    console.warn("Fund report validation warning", summary.validation.checks);
  }

  function updateQuarter(quarter) {
    setFilters((current) => {
      if (quarter === "all" || current.month === "all" || quarterMonths(quarter).includes(Number(current.month))) {
        return { ...current, quarter };
      }
      return { ...current, quarter, month: "all" };
    });
  }

  function updateMonth(month) {
    setFilters((current) => {
      if (month === "all" || current.quarter === "all" || quarterMonths(current.quarter).includes(Number(month))) {
        return { ...current, month };
      }
      return { ...current, month, quarter: "all" };
    });
  }

  function resetFilters() {
    setFilters({ year: defaultYear, quarter: "all", month: "all" });
    setRefreshKey((key) => key + 1);
  }

  function printReport() {
    window.print();
  }

  function downloadPdf() {
    downloadFundReportPdf({
      report,
      period,
      churchName: "SEVENTH-DAY ADVENTIST, BETHEL CHURCH",
      generatedDate
    });
  }

  return (
    <div className="fund-report-screen">
      <PageHeader title="Financial Report" subtitle="Bethel Seventh-day Adventist Church" />

      <section className="fund-report-toolbar no-print">
        <div className="filter-row">
          <Field label="Year">
            <Select value={filters.year} onChange={(event) => setFilters({ ...filters, year: Number(event.target.value) })}>
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </Select>
          </Field>
          <Field label="Quarter">
            <Select value={filters.quarter} onChange={(event) => updateQuarter(event.target.value)}>
              {QUARTERS.map((quarter) => <option key={quarter.id} value={quarter.id}>{quarter.label}</option>)}
            </Select>
          </Field>
          <Field label="Month">
            <Select value={filters.month} onChange={(event) => updateMonth(event.target.value)}>
              <option value="all">All Months</option>
              {MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
            </Select>
          </Field>
        </div>
        <div className="fund-report-actions">
          <Button onClick={() => setRefreshKey((key) => key + 1)}><RefreshCcw size={18} /> Generate Report</Button>
          <Button variant="secondary" disabled={!hasData} onClick={printReport}><Printer size={18} /> Print Report</Button>
          <Button variant="secondary" disabled={!hasData} onClick={downloadPdf}><Download size={18} /> Download PDF</Button>
          <Button variant="ghost" onClick={resetFilters}><RotateCcw size={18} /> Reset Filters</Button>
        </div>
      </section>

      {!summary.validation.ok && ["Administrator", "Treasurer", "Auditor"].includes(user.role) && (
        <div className="alert warning no-print">Calculation validation warning. Please review source offering entries before final audit use.</div>
      )}

      {!hasData ? (
        <EmptyReportState />
      ) : (
        <article className="report-page" id="fund-report-print">
          <ReportHeader period={period} />
          <SharedOfferingsSection section={summary.sectionA} />
          <LocalFundSection section={summary.sectionB} />
          <DirectMissionFundSection section={summary.sectionC} />
          <FundSummarySection rows={summary.rows} />
          <ChurchFinancialStatusSection section={summary.sectionE} />
          <ReportSignatureBlock />
        </article>
      )}
    </div>
  );
}

function ReportHeader({ period }) {
  return (
    <header className="report-heading">
      <h2>SEVENTH-DAY ADVENTIST, BETHEL CHURCH</h2>
      <h3>{period.title}</h3>
      <p>{period.subtitle}</p>
    </header>
  );
}

function SharedOfferingsSection({ section }) {
  return (
    <ReportSection className="section-a" title="SECTION A - 50% SHARED OFFERINGS">
      <table className="report-table">
        <thead><tr><th>Offering</th><th>Gross Collection</th><th>Local Fund (50%)</th><th>Mission Fund (50%)</th></tr></thead>
        <tbody>
          {section.rows.map((row) => <tr key={row.label}><td>{row.label}</td><td className="currency">{formatINR(row.gross)}</td><td className="currency">{formatINR(row.localFund)}</td><td className="currency">{formatINR(row.missionFund)}</td></tr>)}
          <tr className="report-total-row"><td>TOTAL</td><td className="currency">{formatINR(section.total.gross)}</td><td className="currency">{formatINR(section.total.localFund)}</td><td className="currency">{formatINR(section.total.missionFund)}</td></tr>
        </tbody>
      </table>
    </ReportSection>
  );
}

function LocalFundSection({ section }) {
  return (
    <ReportSection className="section-b" title="SECTION B - 100% LOCAL FUND">
      <TwoColumnTable rows={[...section.rows, { label: "TOTAL 100% LOCAL FUND", amount: section.total, total: true }]} />
    </ReportSection>
  );
}

function DirectMissionFundSection({ section }) {
  return (
    <ReportSection className="section-c" title="SECTION C - 100% MISSION FUND">
      <TwoColumnTable rows={[...section.rows, { label: "TOTAL 100% MISSION FUND", amount: section.total, total: true }]} />
    </ReportSection>
  );
}

function FundSummarySection({ rows }) {
  return (
    <ReportSection className="section-d" title="SECTION D - FUND SUMMARY">
      <table className="report-table">
        <thead><tr><th>Description</th><th>Amount</th></tr></thead>
        <tbody>
          {rows.map((row) => <tr key={row.label} className={row.emphasis === "grand" ? "summary-grand" : row.emphasis === "strong" ? "summary-strong" : ""}><td>{row.label}</td><td className="currency">{formatINR(row.amount)}</td></tr>)}
        </tbody>
      </table>
    </ReportSection>
  );
}

function ChurchFinancialStatusSection({ section }) {
  return (
    <ReportSection className="section-e" title="SECTION E - CHURCH FINANCIAL STATUS">
      <TwoColumnTable rows={section.rows} />
    </ReportSection>
  );
}

function TwoColumnTable({ rows }) {
  return (
    <table className="report-table">
      <thead><tr><th>Description</th><th>Amount</th></tr></thead>
      <tbody>
        {rows.map((row) => <tr key={row.label} className={row.total ? "report-total-row" : ""}><td>{row.label}</td><td className="currency">{formatINR(row.amount)}</td></tr>)}
      </tbody>
    </table>
  );
}

function ReportSection({ title, className, children }) {
  return (
    <section className={`report-section ${className}`}>
      <h4>{title}</h4>
      <div className="report-table-wrap">{children}</div>
    </section>
  );
}

function ReportSignatureBlock() {
  return (
    <footer className="report-signatures">
      <SignatureBox label="Prepared By:" role="Treasurer" />
      <SignatureBox label="Checked By:" role="Auditor" />
      <SignatureBox label="Verified By:" role="Church Elder" />
    </footer>
  );
}

function SignatureBox({ label, role }) {
  return (
    <div className="signature-box">
      <span>{label}</span>
      <div className="signature-line" aria-hidden="true" />
      <strong>{role}</strong>
      <span>Date:</span>
    </div>
  );
}

function EmptyReportState() {
  return <div className="empty-report-state">No fund entries were found for the selected reporting period.</div>;
}

function getDefaultYear(years) {
  const currentYear = new Date().getFullYear();
  return years.includes(currentYear) ? currentYear : years[0];
}

function getReportPeriod(filters) {
  const year = Number(filters.year);
  if (filters.month !== "all") {
    const monthName = MONTHS[Number(filters.month) - 1];
    return {
      title: "Monthly Treasurer's Fund Report",
      subtitle: `${monthName} ${year}`,
      filename: `Bethel_Fund_Report_${year}_${monthName}.pdf`
    };
  }
  if (filters.quarter !== "all") {
    const quarterIndex = Number(filters.quarter.slice(1));
    const months = quarterMonths(filters.quarter);
    return {
      title: "Quarterly Treasurer's Fund Report",
      subtitle: `${quarterIndex}${ordinalSuffix(quarterIndex)} Quarter, ${year} | ${MONTHS[months[0] - 1]} - ${MONTHS[months[2] - 1]} ${year}`,
      filename: `Bethel_Fund_Report_${year}_${filters.quarter}.pdf`
    };
  }
  return {
    title: "Annual Treasurer's Fund Report",
    subtitle: `January - December ${year}`,
    filename: `Bethel_Fund_Report_${year}_Annual.pdf`
  };
}

function ordinalSuffix(value) {
  return value === 1 ? "st" : value === 2 ? "nd" : value === 3 ? "rd" : "th";
}
