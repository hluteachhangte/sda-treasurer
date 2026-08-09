import {
  Archive,
  BookOpenCheck,
  FileText,
  Home,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Landmark,
  Users,
  WalletCards
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./Button";

export const pages = [
  { id: "dashboard", label: "Dashboard", icon: Home, roles: ["Administrator", "Treasurer", "Assistant Treasurer", "Auditor", "Pastor or Church Elder"] },
  { id: "local-funds-entry", label: "Local Fund (50%) Entry", icon: Landmark, roles: ["Administrator", "Treasurer", "Assistant Treasurer"] },
  { id: "local-funds-100-entry", label: "Local Fund (100%) Entry", icon: Landmark, roles: ["Administrator", "Treasurer", "Assistant Treasurer"] },
  { id: "mission-funds-entry", label: "Mission Fund Entry", icon: BookOpenCheck, roles: ["Administrator", "Treasurer", "Assistant Treasurer"] },
  { id: "expenditure-entry", label: "Expenditure Entry", icon: WalletCards, roles: ["Administrator", "Treasurer", "Assistant Treasurer"] },
  { id: "local-fund-50-report", label: "Local Fund (50%) Report", icon: FileText, roles: ["Administrator", "Treasurer", "Assistant Treasurer", "Auditor", "Pastor or Church Elder"] },
  { id: "local-fund-100-report", label: "Local Fund (100%) Report", icon: FileText, roles: ["Administrator", "Treasurer", "Assistant Treasurer", "Auditor", "Pastor or Church Elder"] },
  { id: "mission-fund-report", label: "Mission Fund Report", icon: FileText, roles: ["Administrator", "Treasurer", "Assistant Treasurer", "Auditor", "Pastor or Church Elder"] },
  { id: "expenditure-report", label: "Expenditure Report", icon: FileText, roles: ["Administrator", "Treasurer", "Assistant Treasurer", "Auditor", "Pastor or Church Elder"] },
  { id: "fund-report", label: "Financial Report", icon: FileText, roles: ["Administrator", "Treasurer", "Assistant Treasurer", "Auditor", "Pastor or Church Elder"] },
  { id: "mission-remittance", label: "Mission Remittance", icon: BookOpenCheck, roles: ["Administrator", "Treasurer"] },
  { id: "backup", label: "Backup and Export", icon: Archive, roles: ["Administrator", "Treasurer"] },
  { id: "audit", label: "Audit and Reconciliation", icon: ShieldCheck, roles: ["Administrator", "Auditor", "Pastor or Church Elder"] },
  { id: "settings", label: "Settings", icon: Settings, roles: ["Administrator"] },
  { id: "users", label: "User Management", icon: Users, roles: ["Administrator"] },
  { id: "audit-log", label: "Audit Log", icon: ShieldCheck, roles: ["Administrator", "Auditor"] }
];

export function Layout({ activePage, setActivePage, children }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const availablePages = pages.filter((page) => page.roles.includes(user.role));

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <img className="brand-mark" src={`${import.meta.env.BASE_URL}church-logo.png`} alt="" aria-hidden="true" />
          <div>
            <strong>Bethel Church Treasurer</strong>
            <span>Seventh-day Adventist</span>
          </div>
        </div>
        <nav className="nav-list">
          {availablePages.map((page) => {
            const Icon = page.icon;
            return (
              <button
                key={page.id}
                className={activePage === page.id ? "active" : ""}
                onClick={() => {
                  setActivePage(page.id);
                  setOpen(false);
                }}
              >
                <Icon size={18} />
                <span>{page.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="main">
        <header className="topbar">
          <Button variant="ghost" className="menu-btn" onClick={() => setOpen((value) => !value)} aria-label="Menu">
            <Menu size={20} />
          </Button>
          <div className="topbar-user">
            <span>{user.name}</span>
            <small>{user.role}</small>
          </div>
          <Button variant="ghost" onClick={logout}>
            <LogOut size={18} />
            <span>Logout</span>
          </Button>
        </header>
        <div className="content">{children}</div>
      </main>
      <nav className="bottom-nav">
        {availablePages.slice(0, 5).map((page) => {
          const Icon = page.icon;
          return (
            <button key={page.id} className={activePage === page.id ? "active" : ""} onClick={() => setActivePage(page.id)}>
              <Icon size={18} />
              <span>{getBottomNavLabel(page)}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function getBottomNavLabel(page) {
  if (page.id === "local-funds-entry") return "Local 50%";
  if (page.id === "local-funds-100-entry") return "Local 100%";
  if (page.id === "mission-funds-entry") return "Mission";
  if (page.id === "expenditure-entry") return "Expenditure";
  return page.label.split(" ")[0];
}
