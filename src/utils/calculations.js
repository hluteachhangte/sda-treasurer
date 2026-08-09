import { EXPENSE_HEADS, OFFERING_CATEGORIES } from "../data/constants";

export function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function money(value, symbol = "Rs.") {
  return `${symbol} ${toNumber(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function calculateOfferingTotals(offerings = {}, categories = OFFERING_CATEGORIES, allocationPercent = 50) {
  const sharedKeys = categories.filter((cat) => cat.allocation === "shared50").map((cat) => cat.key);
  const localKeys = categories.filter((cat) => cat.allocation === "local100").map((cat) => cat.key);
  const missionKeys = categories.filter((cat) => cat.allocation === "mission100").map((cat) => cat.key);
  const ratio = allocationPercent / 100;

  const sum = (keys) => keys.reduce((total, key) => total + toNumber(offerings[key]), 0);
  const sharedOfferingTotal = sum(sharedKeys);
  const localShare50 = sharedOfferingTotal * ratio;
  const fiftyPercentOffering = sharedOfferingTotal * (1 - ratio);
  const localFund100 = sum(localKeys);
  const directMissionFund = sum(missionKeys);
  const totalLocalFund = localShare50 + localFund100;
  const totalMissionFund = directMissionFund + fiftyPercentOffering;
  const grossOfferingTotal = totalLocalFund + totalMissionFund;

  return {
    sharedOfferingTotal,
    localShare50,
    fiftyPercentOffering,
    localFund100,
    directMissionFund,
    totalLocalFund,
    totalMissionFund,
    grossOfferingTotal
  };
}

export function calculateExpenditureTotals(expenseHeads = {}) {
  const totalExpenditure = EXPENSE_HEADS.reduce((total, head) => total + toNumber(expenseHeads[head.key]), 0);
  return { totalExpenditure };
}

export function calculateRemittanceTotals(values = {}) {
  const tithe = toNumber(values.tithe);
  const investment = toNumber(values.investment);
  const fiftyPercentOffering = toNumber(values.fiftyPercentOffering);
  const openingMissionBalance = toNumber(values.openingMissionBalance);
  const amountRemitted = toNumber(values.amountRemitted);
  const missionFundReceived = tithe + investment + fiftyPercentOffering;
  const totalAmountDue = openingMissionBalance + missionFundReceived;
  const pendingMissionFund = totalAmountDue - amountRemitted;
  const status =
    amountRemitted <= 0 ? "Not Remitted" : pendingMissionFund <= 0 ? "Fully Remitted" : "Partially Remitted";

  return { missionFundReceived, totalAmountDue, pendingMissionFund, status };
}

export function monthMatches(record, filters = {}) {
  return (!filters.year || record.year === Number(filters.year)) && (!filters.month || filters.month === "all" || record.month === Number(filters.month));
}

export function buildMonthlySummary(state, filters = {}) {
  const offerings = state.offerings.filter((item) => item.status !== "Cancelled" && monthMatches(item, filters));
  const expenditures = state.expenditures.filter((item) => item.status !== "Cancelled" && monthMatches(item, filters));
  const remittances = state.remittances.filter((item) => monthMatches(item, filters));

  const offeringTotals = offerings.reduce(
    (acc, item) => {
      Object.keys(acc).forEach((key) => {
        acc[key] += toNumber(item[key]);
      });
      return acc;
    },
    {
      sharedOfferingTotal: 0,
      localShare50: 0,
      fiftyPercentOffering: 0,
      localFund100: 0,
      directMissionFund: 0,
      totalLocalFund: 0,
      totalMissionFund: 0,
      grossOfferingTotal: 0
    }
  );

  const tithe = offerings.reduce((sum, item) => sum + toNumber(item.offerings?.tithe), 0);
  const investment = offerings.reduce((sum, item) => sum + toNumber(item.offerings?.investment), 0);
  const totalExpenditure = expenditures.reduce((sum, item) => sum + toNumber(item.totalExpenditure), 0);
  const missionFundRemitted = remittances.reduce((sum, item) => sum + toNumber(item.amountRemitted), 0);
  const openingLocalBalance = toNumber(state.settings.openingLocalBalance);
  const openingMissionBalance = toNumber(state.settings.openingMissionBalance);
  const localFundBalance = openingLocalBalance + offeringTotals.totalLocalFund - totalExpenditure;
  const missionFundDue = openingMissionBalance + offeringTotals.totalMissionFund;
  const missionFundPending = missionFundDue - missionFundRemitted;

  return {
    ...offeringTotals,
    tithe,
    investment,
    totalExpenditure,
    localFundBalance,
    missionFundDue,
    missionFundRemitted,
    missionFundPending,
    offeringEntries: offerings.length,
    receiptCount: offerings.length,
    voucherCount: expenditures.length,
    offerings,
    expenditures,
    remittances
  };
}

export function groupByMonth(state, year) {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const summary = buildMonthlySummary(state, { year, month });
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

export function amountInWords(amount) {
  const value = Math.round(toNumber(amount));
  if (value === 0) return "Zero rupees only";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const twoDigits = (n) => (n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]} ${ones[n % 10]}`.trim());
  const threeDigits = (n) => {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    return `${hundred ? `${ones[hundred]} Hundred ` : ""}${rest ? twoDigits(rest) : ""}`.trim();
  };
  const crore = Math.floor(value / 10000000);
  const lakh = Math.floor((value % 10000000) / 100000);
  const thousand = Math.floor((value % 100000) / 1000);
  const rest = value % 1000;
  return [
    crore && `${threeDigits(crore)} Crore`,
    lakh && `${threeDigits(lakh)} Lakh`,
    thousand && `${threeDigits(thousand)} Thousand`,
    rest && threeDigits(rest)
  ]
    .filter(Boolean)
    .join(" ")
    .concat(" rupees only");
}

export function nextSequence(prefix, records, field, year, month) {
  const needle = `${year}/${String(month).padStart(2, "0")}`;
  const current = records
    .map((record) => record[field])
    .filter((value) => String(value).includes(needle))
    .map((value) => Number(String(value).split("/").pop()))
    .filter(Number.isFinite);
  return `${prefix}/${year}/${String(month).padStart(2, "0")}/${String(Math.max(0, ...current) + 1).padStart(3, "0")}`;
}
