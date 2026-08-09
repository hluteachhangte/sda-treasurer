const SHARED_FIELDS = [
  { key: "ssOffering", legacyKey: "sabbathSchool", label: "Sabbath School" },
  { key: "birthdayThanks", label: "Birthday & Thanks" },
  { key: "thirteenthSabbath", label: "13th Sabbath" },
  { key: "divineService", label: "Divine Service" },
  { key: "ay", label: "A.Y." }
];

const LOCAL_100_FIELDS = [
  { key: "children", legacyKey: "childrensMinistries", label: "Children" },
  { key: "personalEvangelism", label: "Personal/Evangelism" },
  { key: "ay", label: "A.Y." },
  { key: "womensMinistries", label: "Women's Ministries" },
  { key: "acs", label: "A.C.S." },
  { key: "buildingFund", label: "Building Fund" },
  { key: "others", label: "Others" }
];

const LEGACY_LOCAL_100_FIELDS = [
  { key: "childrensMinistries", label: "Children's Ministries" },
  { key: "womensMinistries", label: "Women's Ministries" },
  { key: "acs", label: "A.C.S." },
  { key: "buildingFund", label: "Building Fund" },
  { key: "internalMaintenance", label: "Internal Maintenance" },
  { key: "personalEvangelism", label: "Personal/Evangelism" },
  { key: "others", label: "Others" }
];

const DIRECT_MISSION_FIELDS = [
  { key: "tithe", label: "Tithe" },
  { key: "investment", label: "Investment" }
];

const LOCAL_100_EXPENSE_KEYS = [
  "children",
  "ssDept",
  "churchExpense",
  "personalMinistries",
  "evangelism",
  "ayExpense",
  "womenMinistries",
  "poorFund",
  "acs",
  "building",
  "others",
  "sabbathSchoolDepartment",
  "ay",
  "womensMinistries"
];

export const FUND_REPORT_FIELDS = {
  shared: SHARED_FIELDS,
  local100: LOCAL_100_FIELDS,
  directMission: DIRECT_MISSION_FIELDS
};

export function normaliseOfferingRecord(record = {}) {
  const offerings = record.offerings || {};
  return {
    ...record,
    offerings: Object.fromEntries(
      [...SHARED_FIELDS, ...LEGACY_LOCAL_100_FIELDS, ...DIRECT_MISSION_FIELDS].map((field) => [field.key, roundMoney(readAmount(offerings, field))])
    )
  };
}

export function filterOfferingRecords(records = [], filters) {
  return records
    .filter((record) => record.status !== "Cancelled" && record.status !== "Deleted")
    .map(normaliseOfferingRecord)
    .filter((record) => {
      if (Number(record.year) !== Number(filters.year)) return false;
      const month = Number(record.month || new Date(record.date).getMonth() + 1);
      if (filters.month !== "all") return month === Number(filters.month);
      if (filters.quarter !== "all") return quarterMonths(filters.quarter).includes(month);
      return true;
    });
}

export function calculateSharedOfferingRows(records = []) {
  const rows = SHARED_FIELDS.map((field) => {
    const gross = sumRecords(records, field);
    return {
      label: field.label,
      gross,
      localFund: roundMoney(gross * 0.5),
      missionFund: roundMoney(gross * 0.5)
    };
  });
  const total = rows.reduce(
    (acc, row) => ({
      gross: roundMoney(acc.gross + row.gross),
      localFund: roundMoney(acc.localFund + row.localFund),
      missionFund: roundMoney(acc.missionFund + row.missionFund)
    }),
    { gross: 0, localFund: 0, missionFund: 0 }
  );
  return { rows, total };
}

export function calculateLocalFund100(records = []) {
  const rows = LOCAL_100_FIELDS.map((field) => ({
    label: field.label,
    amount: sumRecords(records, field)
  }));
  return { rows, total: roundMoney(rows.reduce((sum, row) => sum + row.amount, 0)) };
}

export function calculateDirectMissionFund(records = []) {
  const rows = DIRECT_MISSION_FIELDS.map((field) => ({
    label: field.label,
    amount: sumRecords(records, field)
  }));
  return { rows, total: roundMoney(rows.reduce((sum, row) => sum + row.amount, 0)) };
}

export function buildFundReportFromState(state = {}, filters) {
  const source = {
    local50: filterEntryRecords(state.localFundEntries, filters),
    local100: filterEntryRecords(state.localFund100Entries, filters),
    mission: filterEntryRecords(state.missionFundEntries, filters),
    expenditures: filterEntryRecords(state.expenditures, filters)
  };
  return {
    source,
    recordCount: source.local50.length + source.local100.length + source.mission.length,
    summary: calculateFundSummaryFromEntrySources(source, state.localFund100Worksheet)
  };
}

export function calculateFundSummaryFromEntrySources({ local50 = [], local100 = [], mission = [], expenditures = [] } = {}, worksheet = {}) {
  const sectionA = calculateSharedOfferingRows(local50);
  const sectionB = calculateLocalFund100(local100);
  const sectionC = calculateDirectMissionFund(mission);
  const missionFiftyPercent = sumRecords(mission, { key: "fiftyPercentFromLocalFunds" });
  const fiftyPercentOffering = missionFiftyPercent > 0 ? missionFiftyPercent : sectionA.total.missionFund;
  return buildSummary(sectionA, sectionB, sectionC, {
    fiftyPercentOffering,
    originalCategoryTotal: sectionA.total.localFund + sectionB.total + sectionC.total + fiftyPercentOffering,
    openingBalance: totalObjectValues(worksheet?.openingBalances),
    totalExpense: totalExpenditureRows(expenditures)
  });
}

export function calculateFundSummary(records = []) {
  const sectionA = calculateSharedOfferingRows(records);
  const sectionB = calculateLocalFund100(records);
  const sectionC = calculateDirectMissionFund(records);
  return buildSummary(sectionA, sectionB, sectionC, {
    fiftyPercentOffering: sectionA.total.missionFund,
    originalCategoryTotal: roundMoney(
      records.reduce((sum, record) => sum + Object.values(record.offerings || {}).reduce((inner, value) => inner + safeNumber(value), 0), 0)
    )
  });
}

function buildSummary(sectionA, sectionB, sectionC, options = {}) {
  const localShareFromShared = sectionA.total.localFund;
  const fiftyPercentOffering = roundMoney(options.fiftyPercentOffering);
  const totalLocalFund = roundMoney(localShareFromShared + sectionB.total);
  const totalMissionFund = roundMoney(sectionC.total + fiftyPercentOffering);
  const grandTotalCollection = roundMoney(totalLocalFund + totalMissionFund);
  const originalCategoryTotal = roundMoney(options.originalCategoryTotal);
  const openingBalance = roundMoney(options.openingBalance);
  const totalExpense = roundMoney(options.totalExpense);
  const churchFinancialBalance = roundMoney(totalLocalFund + openingBalance - totalExpense);

  return {
    sectionA,
    sectionB,
    sectionC,
    rows: [
      { label: "50% Offering", amount: localShareFromShared },
      { label: "100% Local Fund", amount: sectionB.total },
      { label: "TOTAL LOCAL FUND", amount: totalLocalFund, emphasis: "strong" },
      { label: "100% Mission Fund", amount: sectionC.total },
      { label: "50% Offering", amount: fiftyPercentOffering },
      { label: "TOTAL MISSION FUND", amount: totalMissionFund, emphasis: "strong" },
      { label: "GRAND TOTAL COLLECTION", amount: grandTotalCollection, emphasis: "grand" }
    ],
    sectionE: {
      rows: [
        { label: "Total Local Fund", amount: totalLocalFund },
        { label: "Opening Balance", amount: openingBalance },
        { label: "Total Expense", amount: totalExpense },
        { label: "Total Balance", amount: churchFinancialBalance, total: true }
      ],
      totals: {
        totalLocalFund,
        openingBalance,
        totalExpense,
        totalBalance: churchFinancialBalance
      }
    },
    totals: {
      localShareFromShared,
      localFund100: sectionB.total,
      totalLocalFund,
      directMissionFund: sectionC.total,
      fiftyPercentOffering,
      totalMissionFund,
      grandTotalCollection,
      originalCategoryTotal,
      openingBalance,
      totalExpense,
      churchFinancialBalance
    },
    validation: validateReportTotals({
      sharedGross: sectionA.total.gross,
      sharedLocal: sectionA.total.localFund,
      sharedMission: sectionA.total.missionFund,
      localFund100: sectionB.total,
      directMissionFund: sectionC.total,
      localShareFromShared,
      fiftyPercentOffering,
      totalLocalFund,
      totalMissionFund,
      grandTotalCollection,
      originalCategoryTotal
    })
  };
}

export function validateReportTotals(summary) {
  const checks = [
    {
      label: "Section A gross equals local share plus mission share",
      ok: sameMoney(summary.sharedGross, summary.sharedLocal + summary.sharedMission)
    },
    {
      label: "Total Local Fund equals shared local share plus 100% Local Fund",
      ok: sameMoney(summary.totalLocalFund, summary.localShareFromShared + summary.localFund100)
    },
    {
      label: "Total Mission Fund equals direct Mission Fund plus 50% Offering",
      ok: sameMoney(summary.totalMissionFund, summary.directMissionFund + summary.fiftyPercentOffering)
    },
    {
      label: "Grand Total equals Total Local Fund plus Total Mission Fund",
      ok: sameMoney(summary.grandTotalCollection, summary.totalLocalFund + summary.totalMissionFund)
    },
    {
      label: "Grand Total equals total of original offering categories",
      ok: sameMoney(summary.grandTotalCollection, summary.originalCategoryTotal)
    }
  ];
  return { ok: checks.every((check) => check.ok), checks };
}

export function formatINR(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(safeNumber(amount));
}

export function quarterMonths(quarter) {
  return {
    Q1: [1, 2, 3],
    Q2: [4, 5, 6],
    Q3: [7, 8, 9],
    Q4: [10, 11, 12]
  }[quarter] || [];
}

export function roundMoney(value) {
  return Math.round((safeNumber(value) + Number.EPSILON) * 100) / 100;
}

export function filterEntryRecords(records = [], filters) {
  return (records || []).filter((record) => {
    if (Number(record.year) !== Number(filters.year)) return false;
    const month = Number(record.month || new Date(record.date).getMonth() + 1);
    if (filters.month !== "all") return month === Number(filters.month);
    if (filters.quarter !== "all") return String(record.quarter) === String(filters.quarter) || quarterMonths(filters.quarter).includes(month);
    return true;
  });
}

export function getFundReportYears(state = {}) {
  const years = [
    ...(state.localFundEntries || []),
    ...(state.localFund100Entries || []),
    ...(state.missionFundEntries || []),
    ...(state.expenditures || [])
  ].map((record) => Number(record.year)).filter(Number.isFinite);
  const uniqueYears = [...new Set(years)].sort((a, b) => b - a);
  return uniqueYears.length ? uniqueYears : [new Date().getFullYear()];
}

function sumRecords(records, field) {
  return roundMoney(records.reduce((sum, record) => sum + readRecordAmount(record, field), 0));
}

function readRecordAmount(record, field) {
  return safeNumber(readAmount(record.amounts, field)) + safeNumber(readAmount(record.offerings, field));
}

function readAmount(values = {}, field) {
  return values?.[field.key] ?? values?.[field.legacyKey] ?? 0;
}

function totalEntryAmounts(records = []) {
  return roundMoney(records.reduce((sum, record) => sum + Object.values(record.amounts || {}).reduce((inner, value) => inner + safeNumber(value), 0), 0));
}

function totalObjectValues(values = {}) {
  return roundMoney(Object.values(values || {}).reduce((sum, value) => sum + safeNumber(value), 0));
}

function totalExpenditureRows(records = []) {
  return roundMoney((records || []).reduce((sum, record) => {
    const expenseHeads = record.expenseHeads || {};
    return sum + LOCAL_100_EXPENSE_KEYS.reduce((inner, key) => inner + safeNumber(expenseHeads[key]), 0);
  }, 0));
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function sameMoney(left, right) {
  return Math.abs(roundMoney(left) - roundMoney(right)) < 0.01;
}
