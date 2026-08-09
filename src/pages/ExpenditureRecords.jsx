import { Eye, FileDown, Printer, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../components/Button";
import { DataTable } from "../components/DataTable";
import { Field, Input, Select } from "../components/Field";
import { Modal } from "../components/Modal";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { AUDIT_STATUSES, EXPENSE_HEADS, MONTHS, PAYMENT_MODES } from "../data/constants";
import { money } from "../utils/calculations";
import { downloadCsv } from "../utils/exporters";

export function ExpenditureRecords() {
  const { user } = useAuth();
  const { state, dispatch } = useData();
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ search: "", month: "", year: "", head: "", approvalStatus: "", auditStatus: "" });
  const rows = useMemo(() => state.expenditures.filter((item) => {
    const text = `${item.voucherNumber} ${item.paidTo} ${item.particulars}`.toLowerCase();
    return (!filters.search || text.includes(filters.search.toLowerCase()))
      && (!filters.month || item.month === Number(filters.month))
      && (!filters.year || item.year === Number(filters.year))
      && (!filters.head || Number(item.expenseHeads?.[filters.head]) > 0)
      && (!filters.approvalStatus || item.approvalStatus === filters.approvalStatus)
      && (!filters.auditStatus || item.auditStatus === filters.auditStatus);
  }), [state.expenditures, filters]);

  function cancel(record) {
    const reason = window.prompt("Cancellation reason");
    if (!reason) return;
    dispatch({ type: "UPDATE_EXPENDITURE", payload: { ...record, status: "Cancelled", cancellationReason: reason, cancelledBy: user.name, cancelledAt: new Date().toISOString() }, log: { user: user.name, role: user.role, action: "Expenditure cancellation", recordType: "Expenditure", recordId: record.id, reason } });
  }

  return (
    <div className="stack">
      <PageHeader title="Expenditure Records" subtitle="Voucher register with approval, audit status and attachment tracking." actions={<Button variant="secondary" onClick={() => downloadCsv("expenditure-records.csv", rows)}><FileDown size={18} /> Export CSV</Button>} />
      <section className="filter-row">
        <Field label="Voucher, paid to or particulars"><Input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></Field>
        <Field label="Year"><Input type="number" value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} /></Field>
        <Field label="Month"><Select value={filters.month} onChange={(e) => setFilters({ ...filters, month: e.target.value })}><option value="">All</option>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</Select></Field>
        <Field label="Expenditure head"><Select value={filters.head} onChange={(e) => setFilters({ ...filters, head: e.target.value })}><option value="">All</option>{EXPENSE_HEADS.map((head) => <option key={head.key} value={head.key}>{head.label}</option>)}</Select></Field>
        <Field label="Approval status"><Select value={filters.approvalStatus} onChange={(e) => setFilters({ ...filters, approvalStatus: e.target.value })}><option value="">All</option><option>Approved</option><option>Pending</option></Select></Field>
        <Field label="Audit status"><Select value={filters.auditStatus} onChange={(e) => setFilters({ ...filters, auditStatus: e.target.value })}><option value="">All</option>{AUDIT_STATUSES.map((status) => <option key={status}>{status}</option>)}</Select></Field>
      </section>
      <DataTable
        rows={rows}
        columns={[
          { key: "date", label: "Date" },
          { key: "voucherNumber", label: "Voucher Number" },
          { key: "particulars", label: "Particulars" },
          { key: "paidTo", label: "Paid To" },
          { key: "totalExpenditure", label: "Expenditure Total", render: (row) => money(row.totalExpenditure, state.settings.currencySymbol) },
          { key: "paymentMode", label: "Payment Mode" },
          { key: "approvalStatus", label: "Approval Status" },
          { key: "auditStatus", label: "Audit Status" },
          { key: "attachments", label: "Attachment", render: (row) => row.attachments?.length ? row.attachments.join(", ") : "Missing" },
          { key: "actions", label: "Actions", render: (row) => (
            <div className="row-actions">
              <Button variant="ghost" onClick={() => setSelected(row)}><Eye size={16} /></Button>
              <Button variant="ghost" onClick={() => window.print()}><Printer size={16} /></Button>
              <Button variant="ghost" disabled={row.auditStatus === "Locked" || row.status === "Cancelled"} onClick={() => cancel(row)}><XCircle size={16} /></Button>
            </div>
          ) }
        ]}
      />
      {selected && (
        <Modal title={`Voucher ${selected.voucherNumber}`} onClose={() => setSelected(null)}>
          <div className="detail-list">
            <span>Paid to <strong>{selected.paidTo}</strong></span>
            <span>Particulars <strong>{selected.particulars}</strong></span>
            <span>Total <strong>{money(selected.totalExpenditure, state.settings.currencySymbol)}</strong></span>
            <span>Attachments <strong>{selected.attachments?.join(", ") || "Missing"}</strong></span>
          </div>
        </Modal>
      )}
    </div>
  );
}
