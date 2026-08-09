export const CHURCH_ID = "bethel-sda";
export const DEFAULT_CHURCH_NAME = "Bethel Seventh-day Adventist Church";
export const DEFAULT_CONFERENCE_NAME = "Mizo Conference of Seventh-day Adventists";

export const ROLES = [
  "Administrator",
  "Treasurer",
  "Assistant Treasurer",
  "Auditor",
  "Pastor or Church Elder"
];

export const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "Mixed"];

export const OFFERING_CATEGORIES = [
  { key: "sabbathSchool", label: "Sabbath School", allocation: "shared50" },
  { key: "birthdayThanks", label: "Birthday & Thanks", allocation: "shared50" },
  { key: "thirteenthSabbath", label: "13th Sabbath", allocation: "shared50" },
  { key: "investment", label: "Investment", allocation: "mission100" },
  { key: "childrensMinistries", label: "Children's Ministries", allocation: "local100" },
  { key: "womensMinistries", label: "Women's Ministries", allocation: "local100" },
  { key: "internalMaintenance", label: "Internal Maintenance", allocation: "local100", configurable: true },
  { key: "divineService", label: "Divine Service", allocation: "shared50" },
  { key: "tithe", label: "Tithe", allocation: "mission100" },
  { key: "ay", label: "A.Y.", allocation: "shared50" },
  { key: "acs", label: "A.C.S.", allocation: "local100" },
  { key: "buildingFund", label: "Building Fund", allocation: "local100" },
  { key: "others", label: "Others", allocation: "local100" },
  { key: "personalEvangelism", label: "Personal/Evangelism", allocation: "local100", configurable: true }
];

export const EXPENSE_HEADS = [
  { key: "sabbathSchoolDepartment", label: "Sabbath School Department" },
  { key: "churchExpense", label: "Church Expense" },
  { key: "personalMinistries", label: "Personal Ministries" },
  { key: "ay", label: "A.Y." },
  { key: "womensMinistries", label: "Women's Ministries" },
  { key: "building", label: "Building" },
  { key: "others", label: "Others" }
];

export const DEFAULT_QUARTERS = [
  { id: "Q1", label: "First Quarter", months: [1, 2, 3] },
  { id: "Q2", label: "Second Quarter", months: [4, 5, 6] },
  { id: "Q3", label: "Third Quarter", months: [7, 8, 9] },
  { id: "Q4", label: "Fourth Quarter", months: [10, 11, 12] }
];

export const AUDIT_STATUSES = ["Draft", "Submitted for Audit", "Under Review", "Correction Required", "Audited", "Locked"];

export const AUDIT_CHECKLIST = [
  "All Sabbath entries completed",
  "Receipt numbers checked",
  "No duplicate receipts",
  "All offering totals verified",
  "50% calculations verified",
  "Tithe totals verified",
  "Investment totals verified",
  "Expenditure vouchers checked",
  "Supporting documents attached",
  "Local Fund balance reconciled",
  "Mission Fund balance reconciled",
  "Cash balance verified",
  "Bank or UPI balance verified",
  "Conference remittance verified",
  "Opening and closing balances verified"
];

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
