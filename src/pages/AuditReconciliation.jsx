import { Lock, RotateCcw, Send, ThumbsUp } from "lucide-react";
import { Button } from "../components/Button";
import { Field, Input, Select, Textarea } from "../components/Field";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { AUDIT_CHECKLIST, AUDIT_STATUSES, MONTHS } from "../data/constants";
import { useState } from "react";

export function AuditReconciliation() {
  const { user } = useAuth();
  const { state, dispatch } = useData();
  const now = new Date();
  const [filters, setFilters] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [remark, setRemark] = useState("");
  const audit = state.audits.find((item) => item.year === filters.year && item.month === filters.month) || {
    id: `audit-${filters.year}-${String(filters.month).padStart(2, "0")}`,
    year: filters.year,
    month: filters.month,
    status: "Draft",
    checklist: AUDIT_CHECKLIST.map((item) => ({ item, checked: false })),
    remarks: [],
    locked: false
  };

  function updateAudit(next, action, reason = "") {
    dispatch({ type: "UPDATE_AUDIT", payload: next, log: { user: user.name, role: user.role, action, recordType: "Audit", recordId: next.id, newValue: next.status, reason } });
  }

  function setStatus(status) {
    updateAudit({ ...audit, status, locked: status === "Locked" }, status === "Locked" ? "Month locked" : "Audit status changed");
  }

  function reopen() {
    const reason = window.prompt("Reason for reopening locked month");
    if (!reason) return;
    updateAudit({ ...audit, status: "Draft", locked: false }, "Month reopened", reason);
  }

  return (
    <div className="stack">
      <PageHeader title="Audit and Reconciliation" subtitle="Monthly checklist, auditor remarks, approvals, locking and reopening controls." />
      <section className="filter-row">
        <Field label="Year"><Input type="number" value={filters.year} onChange={(e) => setFilters({ ...filters, year: Number(e.target.value) })} /></Field>
        <Field label="Month"><Select value={filters.month} onChange={(e) => setFilters({ ...filters, month: Number(e.target.value) })}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</Select></Field>
        <Field label="Audit status"><Select value={audit.status} onChange={(e) => setStatus(e.target.value)}>{AUDIT_STATUSES.map((status) => <option key={status}>{status}</option>)}</Select></Field>
      </section>
      <section className="form-card">
        <h2>Audit Checklist</h2>
        <div className="check-grid">
          {audit.checklist.map((entry, index) => (
            <label key={entry.item} className="check-item">
              <input
                type="checkbox"
                checked={entry.checked}
                onChange={(e) => {
                  const checklist = audit.checklist.map((item, itemIndex) => itemIndex === index ? { ...item, checked: e.target.checked } : item);
                  updateAudit({ ...audit, checklist }, "Audit checklist updated");
                }}
              />
              {entry.item}
            </label>
          ))}
        </div>
      </section>
      <section className="form-card">
        <h2>Remarks and Actions</h2>
        <Field label="Audit or approval remarks"><Textarea value={remark} onChange={(e) => setRemark(e.target.value)} /></Field>
        <div className="button-row">
          <Button onClick={() => setStatus("Submitted for Audit")}><Send size={18} /> Submit for Audit</Button>
          <Button variant="secondary" onClick={() => setStatus("Audited")}><ThumbsUp size={18} /> Approve</Button>
          <Button variant="secondary" onClick={() => setStatus("Correction Required")}>Return for Correction</Button>
          <Button variant="secondary" onClick={() => setStatus("Locked")}><Lock size={18} /> Lock Month</Button>
          {user.role === "Administrator" && <Button variant="ghost" onClick={reopen}><RotateCcw size={18} /> Reopen Month</Button>}
          <Button variant="ghost" onClick={() => {
            if (!remark) return;
            updateAudit({ ...audit, remarks: [...audit.remarks, { by: user.name, role: user.role, text: remark, at: new Date().toISOString() }] }, "Audit remark added");
            setRemark("");
          }}>Add Remark</Button>
        </div>
        <div className="timeline">
          {audit.remarks.map((item, index) => <p key={index}><strong>{item.by}</strong> {item.text}</p>)}
        </div>
      </section>
    </div>
  );
}
