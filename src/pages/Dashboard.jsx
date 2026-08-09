import { AlertTriangle, CheckCircle2, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Field, Select } from "../components/Field";
import { PageHeader } from "../components/PageHeader";
import { SummaryCard } from "../components/SummaryCard";
import { useData } from "../contexts/DataContext";
import { MONTHS } from "../data/constants";
import { money, toNumber } from "../utils/calculations";
import { buildFundReportFromState, filterEntryRecords, FUND_REPORT_FIELDS, quarterMonths as reportQuarterMonths } from "../utils/fundReportCalculations";

export function Dashboard() {
  const { state } = useData();
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const defaultQuarter = getQuarterForMonth(state.settings.quarters, currentMonth);
  const [filters, setFilters] = useState({
    year: today.getFullYear(),
    month: currentMonth,
    quarter: defaultQuarter?.id || state.settings.quarters[0]?.id,
    financialYear: today.getFullYear()
  });
  const selectedQuarter = useMemo(
    () => state.settings.quarters.find((quarter) => quarter.id === filters.quarter),
    [state.settings.quarters, filters.quarter]
  );
  const quarterMonths = filters.quarter === "all" ? Array.from({ length: 12 }, (_, index) => index + 1) : selectedQuarter?.months?.length ? selectedQuarter.months : [filters.month];
  const summary = useMemo(() => buildDashboardSummary(state, filters), [state, filters]);
  const monthly = useMemo(
    () => buildDashboardMonthlySummary(state, filters.year).filter((item) => quarterMonths.includes(item.month)),
    [state, filters.year, quarterMonths]
  );
  const categoryBreakdown = useMemo(() => buildCategoryBreakdown(summary.source, summary), [summary]);
  const expenditureByDepartment = useMemo(() => buildExpenditureBreakdown(summary.source.expenditures), [summary.source.expenditures]);
  const receiptNumbers = [
    ...(state.localFundEntries || []).map((item) => item.receiptNo),
    ...(state.localFund100Entries || []).map((item) => item.receiptNo),
    ...(state.missionFundEntries || []).map((item) => item.receiptNo)
  ].filter(Boolean);
  const voucherNumbers = (state.expenditures || []).map((item) => item.voucherNumber).filter(Boolean);
  const warnings = [
    new Set(receiptNumbers).size !== receiptNumbers.length && "Duplicate receipt numbers",
    new Set(voucherNumbers).size !== voucherNumbers.length && "Duplicate voucher numbers",
    summary.missionFundPending > 0 && "Mission Fund pending",
    filters.month !== "all" && !state.audits.find((item) => item.year === filters.year && item.month === filters.month && ["Audited", "Locked"].includes(item.status)) && "Unaudited month",
    Math.abs(summary.grossOfferingTotal - (summary.totalLocalFund + summary.totalMissionFund)) > 0.01 && "Unbalanced records"
  ].filter(Boolean);

  return (
    <div className="stack">
      <PageHeader title="Dashboard" subtitle="Live summary of offerings, expenditures, remittances and audit warnings." />
      <section className="filter-row">
        <Field label="Church">
          <Select value="bethel-sda" onChange={() => {}}><option value="bethel-sda">Bethel Church</option></Select>
        </Field>
        <Field label="Quarter">
          <Select
            value={filters.quarter}
            onChange={(event) => {
              if (event.target.value === "all") {
                setFilters((current) => ({
                  ...current,
                  quarter: "all",
                  month: "all"
                }));
                return;
              }
              const nextQuarter = state.settings.quarters.find((quarter) => quarter.id === event.target.value);
              const nextMonths = nextQuarter?.months || [];
              setFilters((current) => ({
                ...current,
                quarter: event.target.value,
                month: nextMonths.includes(Number(current.month)) ? current.month : nextMonths[0] || current.month
              }));
            }}
          >
            <option value="all">All</option>
            {state.settings.quarters.map((quarter) => <option key={quarter.id} value={quarter.id}>{quarter.label}</option>)}
          </Select>
        </Field>
        <Field label="Month">
          <Select value={filters.month} onChange={(event) => setFilters({ ...filters, month: event.target.value === "all" ? "all" : Number(event.target.value) })}>
            {filters.quarter === "all" && <option value="all">All Months</option>}
            {quarterMonths.map((monthNumber) => <option key={monthNumber} value={monthNumber}>{MONTHS[monthNumber - 1]}</option>)}
          </Select>
        </Field>
        <Field label="Year">
          <Select value={filters.year} onChange={(event) => setFilters({ ...filters, year: Number(event.target.value) })}><option>{today.getFullYear()}</option><option>{today.getFullYear() - 1}</option></Select>
        </Field>
        <Field label="Financial year">
          <Select value={filters.financialYear} onChange={(event) => setFilters({ ...filters, financialYear: Number(event.target.value) })}>{[today.getFullYear(), today.getFullYear() - 1].map((year) => <option key={year}>{year}</option>)}</Select>
        </Field>
      </section>

      <section className="summary-grid">
        <SummaryCard label="Gross Offerings" value={money(summary.grossOfferingTotal, state.settings.currencySymbol)} />
        <SummaryCard label="Total Local Fund" value={money(summary.totalLocalFund, state.settings.currencySymbol)} tone="green" />
        <SummaryCard label="100% Local Fund" value={money(summary.localFund100, state.settings.currencySymbol)} tone="green" />
        <SummaryCard label="Total Mission Fund" value={money(summary.totalMissionFund, state.settings.currencySymbol)} tone="gold" />
        <SummaryCard label="Tithe" value={money(summary.tithe, state.settings.currencySymbol)} tone="gold" />
        <SummaryCard label="Investment" value={money(summary.investment, state.settings.currencySymbol)} tone="gold" />
        <SummaryCard label="50% Offering" value={money(summary.fiftyPercentOffering, state.settings.currencySymbol)} />
        <SummaryCard label="Total Expenditure" value={money(summary.totalExpenditure, state.settings.currencySymbol)} tone="red" />
        <SummaryCard label="Local Fund Balance" value={money(summary.localFundBalance, state.settings.currencySymbol)} tone="green" />
        <SummaryCard label="Mission Fund Due" value={money(summary.missionFundDue, state.settings.currencySymbol)} tone="gold" />
        <SummaryCard label="Mission Fund Remitted" value={money(summary.missionFundRemitted, state.settings.currencySymbol)} tone="green" />
        <SummaryCard label="Mission Fund Pending" value={money(summary.missionFundPending, state.settings.currencySymbol)} tone="red" />
      </section>

      <section className="chart-grid">
        <ChartPanel title="Monthly Local Fund versus Mission Fund">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => money(value, state.settings.currencySymbol)} />
              <Bar dataKey="local" fill="#3c8d5a" />
              <Bar dataKey="mission" fill="#f4c542" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Monthly offerings trend">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => money(value, state.settings.currencySymbol)} />
              <Line type="monotone" dataKey="offerings" stroke="#123c69" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Monthly expenditure trend">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => money(value, state.settings.currencySymbol)} />
              <Line type="monotone" dataKey="expenditure" stroke="#b43f3f" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Department-wise expenditure">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={expenditureByDepartment}>
              <XAxis dataKey="name" hide />
              <YAxis />
              <Tooltip formatter={(value) => money(value, state.settings.currencySymbol)} />
              <Bar dataKey="value" fill="#3c8d5a" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Mission Fund remittance status">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={[{ name: "Remitted", value: summary.missionFundRemitted }, { name: "Pending", value: Math.max(summary.missionFundPending, 0) }]} dataKey="value" nameKey="name" outerRadius={90}>
                <Cell fill="#3c8d5a" />
                <Cell fill="#b43f3f" />
              </Pie>
              <Tooltip formatter={(value) => money(value, state.settings.currencySymbol)} />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Offering category breakdown">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={categoryBreakdown} dataKey="value" nameKey="name" outerRadius={90}>
                {categoryBreakdown.map((_, index) => <Cell key={index} fill={["#123c69", "#3c8d5a", "#f4c542", "#875f32", "#b43f3f"][index % 5]} />)}
              </Pie>
              <Tooltip formatter={(value) => money(value, state.settings.currencySymbol)} />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>
      </section>

      <section className="warning-grid">
        {warnings.length === 0 ? (
          <div className="alert success"><CheckCircle2 size={18} /> No warnings for the selected month.</div>
        ) : warnings.map((warning) => (
          <div className="alert warning" key={warning}><AlertTriangle size={18} /> {warning}</div>
        ))}
        {!navigator.onLine && <div className="alert danger"><WifiOff size={18} /> Internet disconnected. Drafts will be saved locally.</div>}
      </section>
    </div>
  );
}

function getQuarterForMonth(quarters, month) {
  return quarters.find((quarter) => quarter.months.includes(month));
}

function ChartPanel({ title, children }) {
  return (
    <section className="chart-panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function buildDashboardSummary(state, filters) {
  const report = buildFundReportFromState(state, filters);
  const totals = report.summary.totals;
  const remittances = filterDashboardRecords(state.remittances || [], filters);
  const missionFundRemitted = remittances.reduce((sum, item) => sum + toNumber(item.amountRemitted), 0);
  const openingMissionBalance = toNumber(state.settings.openingMissionBalance);
  const missionFundDue = openingMissionBalance + totals.totalMissionFund;
  const missionFundPending = missionFundDue - missionFundRemitted;

  return {
    source: report.source,
    grossOfferingTotal: totals.grandTotalCollection,
    totalLocalFund: totals.totalLocalFund,
    localFund100: totals.localFund100,
    totalMissionFund: totals.totalMissionFund,
    tithe: readSectionAmount(report.summary.sectionC, "Tithe"),
    investment: readSectionAmount(report.summary.sectionC, "Investment"),
    fiftyPercentOffering: totals.fiftyPercentOffering,
    totalExpenditure: totals.totalExpense,
    localFundBalance: totals.churchFinancialBalance,
    missionFundDue,
    missionFundRemitted,
    missionFundPending,
    remittances
  };
}

function buildDashboardMonthlySummary(state, year) {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const summary = buildDashboardSummary(state, { year, month, quarter: "all" });
    return {
      month,
      name: new Date(year, index, 1).toLocaleString("en", { month: "short" }),
      local: summary.totalLocalFund,
      mission: summary.totalMissionFund,
      offerings: summary.grossOfferingTotal,
      expenditure: summary.totalExpenditure,
      remitted: summary.missionFundRemitted,
      pending: summary.missionFundPending
    };
  });
}

function buildCategoryBreakdown(source, summary) {
  const shared = FUND_REPORT_FIELDS.shared.map((field) => ({
    name: field.label,
    value: sumAmounts(source.local50, field.key)
  }));
  const local100 = FUND_REPORT_FIELDS.local100.map((field) => ({
    name: field.label,
    value: sumAmounts(source.local100, field.key)
  }));
  const mission = FUND_REPORT_FIELDS.directMission.map((field) => ({
    name: field.label,
    value: sumAmounts(source.mission, field.key)
  }));
  return [
    ...shared,
    ...local100,
    ...mission,
    { name: "50% from Local Fund", value: summary.fiftyPercentOffering }
  ].filter((item) => item.value > 0);
}

function buildExpenditureBreakdown(expenditures = []) {
  const labels = {
    ssDept: "S.S. Dept.",
    sabbathSchoolDepartment: "S.S. Dept.",
    churchExpense: "Church Expense",
    personalMinistries: "Personal/Evangelism",
    personalEvangelism: "Personal/Evangelism",
    evangelism: "Personal/Evangelism",
    ayExpense: "AY",
    ay: "AY",
    womenMinistries: "Women's Ministries",
    womensMinistries: "Women's Ministries",
    acs: "ACS",
    building: "Building",
    buildingFund: "Building",
    others: "Others"
  };
  const totals = expenditures.reduce((acc, item) => {
    Object.entries(item.expenseHeads || {}).forEach(([key, value]) => {
      const label = labels[key] || key;
      acc[label] = (acc[label] || 0) + toNumber(value);
    });
    return acc;
  }, {});
  return Object.entries(totals).map(([name, value]) => ({ name, value })).filter((item) => item.value > 0);
}

function filterDashboardRecords(records = [], filters = {}) {
  return filterEntryRecords(records, filters).filter((record) => {
    if (filters.quarter === "all" || filters.month !== "all") return true;
    const month = Number(record.month || new Date(record.date || record.remittanceDate).getMonth() + 1);
    return reportQuarterMonths(filters.quarter).includes(month);
  });
}

function readSectionAmount(section, label) {
  return section.rows.find((row) => row.label === label)?.amount || 0;
}

function sumAmounts(records = [], key) {
  return records.reduce((sum, record) => sum + toNumber(record.amounts?.[key] ?? record.offerings?.[key]), 0);
}
