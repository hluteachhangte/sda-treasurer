import { AlertTriangle, CheckCircle2, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Field, Select } from "../components/Field";
import { PageHeader } from "../components/PageHeader";
import { SummaryCard } from "../components/SummaryCard";
import { useData } from "../contexts/DataContext";
import { MONTHS, OFFERING_CATEGORIES } from "../data/constants";
import { buildMonthlySummary, groupByMonth, money, toNumber } from "../utils/calculations";

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
  const summary = buildMonthlySummary(state, filters);
  const monthly = groupByMonth(state, filters.year).filter((item) => quarterMonths.includes(item.month));
  const categoryBreakdown = OFFERING_CATEGORIES.map((cat) => ({
    name: cat.label,
    value: summary.offerings.reduce((sum, item) => sum + toNumber(item.offerings?.[cat.key]), 0)
  })).filter((item) => item.value > 0);
  const expenditureByDepartment = Object.entries(
    summary.expenditures.reduce((acc, item) => {
      Object.entries(item.expenseHeads || {}).forEach(([key, value]) => {
        acc[key] = (acc[key] || 0) + toNumber(value);
      });
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));
  const receiptNumbers = state.offerings.map((item) => item.receiptNumber);
  const voucherNumbers = state.expenditures.map((item) => item.voucherNumber);
  const warnings = [
    summary.offeringEntries < 4 && "Missing Sabbath entries",
    new Set(receiptNumbers).size !== receiptNumbers.length && "Duplicate receipt numbers",
    new Set(voucherNumbers).size !== voucherNumbers.length && "Duplicate voucher numbers",
    summary.missionFundPending > 0 && "Mission Fund pending",
    filters.month !== "all" && !state.audits.find((item) => item.year === filters.year && item.month === filters.month && ["Audited", "Locked"].includes(item.status)) && "Unaudited month",
    Math.abs(summary.grossOfferingTotal - (summary.totalLocalFund + summary.totalMissionFund)) > 0.01 && "Unbalanced records",
    state.expenditures.some((item) => !item.attachments?.length) && "Missing supporting documents"
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
