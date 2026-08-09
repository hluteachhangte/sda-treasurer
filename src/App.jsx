import { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { DataProvider } from "./contexts/DataContext";
import { Layout, pages } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { LocalFundsEntry } from "./pages/LocalFundsEntry";
import { LocalFunds100Entry } from "./pages/LocalFunds100Entry";
import { MissionFundsEntry } from "./pages/MissionFundsEntry";
import { OfferingRecords } from "./pages/OfferingRecords";
import { ReceiptRegister } from "./pages/ReceiptRegister";
import { ExpenditureEntry } from "./pages/ExpenditureEntry";
import { ExpenditureRecords } from "./pages/ExpenditureRecords";
import { MissionRemittance } from "./pages/MissionRemittance";
import { MonthlyReports } from "./pages/MonthlyReports";
import { QuarterlyReports } from "./pages/QuarterlyReports";
import { FundReportPage } from "./pages/reports/FundReportPage";
import { LocalFund50ReportPage } from "./pages/reports/LocalFund50ReportPage";
import { LocalFund100ReportPage } from "./pages/reports/LocalFund100ReportPage";
import { MissionFundReportPage } from "./pages/reports/MissionFundReportPage";
import { ExpenditureReportPage } from "./pages/reports/ExpenditureReportPage";
import { AuditReconciliation } from "./pages/AuditReconciliation";
import { SettingsPage } from "./pages/SettingsPage";
import { UserManagement } from "./pages/UserManagement";
import { BackupExport } from "./pages/BackupExport";
import { AuditLog } from "./pages/AuditLog";

const PageMap = {
  dashboard: Dashboard,
  "local-funds-entry": LocalFundsEntry,
  "local-funds-100-entry": LocalFunds100Entry,
  "mission-funds-entry": MissionFundsEntry,
  "offering-records": OfferingRecords,
  "receipt-register": ReceiptRegister,
  "expenditure-entry": ExpenditureEntry,
  "expenditure-records": ExpenditureRecords,
  "mission-remittance": MissionRemittance,
  "monthly-reports": MonthlyReports,
  "quarterly-reports": QuarterlyReports,
  "fund-report": FundReportPage,
  "local-fund-50-report": LocalFund50ReportPage,
  "local-fund-100-report": LocalFund100ReportPage,
  "mission-fund-report": MissionFundReportPage,
  "expenditure-report": ExpenditureReportPage,
  audit: AuditReconciliation,
  settings: SettingsPage,
  users: UserManagement,
  backup: BackupExport,
  "audit-log": AuditLog
};

function AppFrame() {
  const { user } = useAuth();
  const [activePage, setActivePage] = useState("dashboard");
  if (!user) return <Login />;

  const page = pages.find((item) => item.id === activePage);
  const allowed = page?.roles.includes(user.role);
  const ActivePage = allowed ? PageMap[activePage] : Dashboard;

  return (
    <Layout activePage={allowed ? activePage : "dashboard"} setActivePage={setActivePage}>
      <ActivePage />
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppFrame />
      </DataProvider>
    </AuthProvider>
  );
}
