import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../components/Button";
import { DataTable } from "../components/DataTable";
import { Field, Input, Select } from "../components/Field";
import { PageHeader } from "../components/PageHeader";
import { useData } from "../contexts/DataContext";
import { MONTHS } from "../data/constants";
import { buildMonthlySummary, money } from "../utils/calculations";
import { downloadCsv } from "../utils/exporters";

export function QuarterlyReports() {
  const { state } = useData();
  const now = new Date();
  const [filters, setFilters] = useState({ year: now.getFullYear(), quarter: "Q3" });
  const quarter = state.settings.quarters.find((item) => item.id === filters.quarter) || state.settings.quarters[0];
  const rows = useMemo(() => quarter.months.map((month) => {
    const summary = buildMonthlySummary(state, { year: filters.year, month });
    const audit = state.audits.find((item) => item.year === filters.year && item.month === month);
    return {
      id: `${filters.year}-${month}`,
      month: MONTHS[month - 1],
      shared: summary.sharedOfferingTotal,
      local100: summary.localFund100,
      mission: summary.totalMissionFund,
      expenditure: summary.totalExpenditure,
      remittance: summary.missionFundRemitted,
      closingLocal: summary.localFundBalance,
      closingMission: summary.missionFundPending,
      auditStatus: audit?.status || "Draft"
    };
  }), [state, filters, quarter]);
  const totals = rows.reduce((acc, row) => {
    ["shared", "local100", "mission", "expenditure", "remittance", "closingLocal", "closingMission"].forEach((key) => { acc[key] += row[key]; });
    return acc;
  }, { shared: 0, local100: 0, mission: 0, expenditure: 0, remittance: 0, closingLocal: 0, closingMission: 0 });

  return (
    <div className="stack">
      <PageHeader title="Quarterly Reports" subtitle="Quarterly 50% offering, local fund, mission fund, expenditure and remittance summaries." actions={<Button variant="secondary" onClick={() => downloadCsv("quarterly-report.csv", rows)}><Download size={18} /> Export CSV</Button>} />
      <section className="filter-row">
        <Field label="Year"><Input type="number" value={filters.year} onChange={(e) => setFilters({ ...filters, year: Number(e.target.value) })} /></Field>
        <Field label="Quarter"><Select value={filters.quarter} onChange={(e) => setFilters({ ...filters, quarter: e.target.value })}>{state.settings.quarters.map((q) => <option key={q.id} value={q.id}>{q.label}</option>)}</Select></Field>
      </section>
      <DataTable
        rows={rows}
        columns={[
          { key: "month", label: "Month" },
          { key: "shared", label: "50% Offering Statement", render: (row) => money(row.shared, state.settings.currencySymbol) },
          { key: "local100", label: "100% Local Fund Statement", render: (row) => money(row.local100, state.settings.currencySymbol) },
          { key: "mission", label: "Mission Fund Statement", render: (row) => money(row.mission, state.settings.currencySymbol) },
          { key: "expenditure", label: "Expenditure Statement", render: (row) => money(row.expenditure, state.settings.currencySymbol) },
          { key: "remittance", label: "Mission Remittance", render: (row) => money(row.remittance, state.settings.currencySymbol) },
          { key: "auditStatus", label: "Audit Status" }
        ]}
      />
      <section className="report-totals">
        <span>Quarter Total Receipts: <strong>{money(totals.shared + totals.local100 + totals.mission, state.settings.currencySymbol)}</strong></span>
        <span>Total Expenditure: <strong>{money(totals.expenditure, state.settings.currencySymbol)}</strong></span>
        <span>Total Remittances: <strong>{money(totals.remittance, state.settings.currencySymbol)}</strong></span>
        <span>Closing Local Balance: <strong>{money(totals.closingLocal, state.settings.currencySymbol)}</strong></span>
        <span>Closing Mission Balance: <strong>{money(totals.closingMission, state.settings.currencySymbol)}</strong></span>
      </section>
    </div>
  );
}
