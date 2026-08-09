import { Copy, Eye, FileDown, Printer, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../components/Button";
import { DataTable } from "../components/DataTable";
import { Field, Input, Select } from "../components/Field";
import { Modal } from "../components/Modal";
import { PageHeader } from "../components/PageHeader";
import { Receipt } from "../components/Receipt";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { AUDIT_STATUSES, MONTHS, PAYMENT_MODES } from "../data/constants";
import { money, nextSequence } from "../utils/calculations";
import { downloadCsv, printElement } from "../utils/exporters";

export function OfferingRecords() {
  const { user } = useAuth();
  const { state, dispatch } = useData();
  const [filters, setFilters] = useState({ search: "", month: "", year: "", paymentMode: "", auditStatus: "" });
  const [selected, setSelected] = useState(null);
  const rows = useMemo(() => state.offerings.filter((item) => {
    const text = `${item.receiptNumber} ${item.receivedFrom}`.toLowerCase();
    return (!filters.search || text.includes(filters.search.toLowerCase()))
      && (!filters.month || item.month === Number(filters.month))
      && (!filters.year || item.year === Number(filters.year))
      && (!filters.paymentMode || item.paymentMode === filters.paymentMode)
      && (!filters.auditStatus || item.auditStatus === filters.auditStatus);
  }), [state.offerings, filters]);

  function cancel(record) {
    const reason = window.prompt("Cancellation reason");
    if (!reason) return;
    dispatch({
      type: "UPDATE_OFFERING",
      payload: { ...record, status: "Cancelled", cancellationReason: reason, cancelledBy: user.name, cancelledAt: new Date().toISOString() },
      log: { user: user.name, role: user.role, action: "Offering cancellation", recordType: "Offering", recordId: record.id, reason }
    });
  }

  function duplicate(record) {
    const copied = {
      ...record,
      id: crypto.randomUUID(),
      receiptNumber: nextSequence("BSC", state.offerings, "receiptNumber", record.year, record.month),
      status: "Active",
      auditStatus: "Draft",
      createdBy: user.name,
      createdAt: new Date().toISOString()
    };
    dispatch({ type: "ADD_OFFERING", payload: copied, log: { user: user.name, role: user.role, action: "Offering duplicate entry", recordType: "Offering", recordId: copied.id, newValue: copied.receiptNumber } });
  }

  const columns = [
    { key: "date", label: "Date" },
    { key: "sabbathNumber", label: "Sabbath" },
    { key: "receiptNumber", label: "Receipt Number" },
    { key: "receivedFrom", label: "Received From" },
    { key: "grossOfferingTotal", label: "Gross Offering", render: (row) => money(row.grossOfferingTotal, state.settings.currencySymbol) },
    { key: "totalLocalFund", label: "Local Fund", render: (row) => money(row.totalLocalFund, state.settings.currencySymbol) },
    { key: "totalMissionFund", label: "Mission Fund", render: (row) => money(row.totalMissionFund, state.settings.currencySymbol) },
    { key: "paymentMode", label: "Payment Mode" },
    { key: "auditStatus", label: "Audit Status", render: (row) => <span className={`status ${row.auditStatus === "Locked" ? "danger" : ""}`}>{row.auditStatus}</span> },
    { key: "createdBy", label: "Entered By" },
    { key: "actions", label: "Actions", render: (row) => (
      <div className="row-actions">
        <Button variant="ghost" aria-label="View" onClick={() => setSelected(row)}><Eye size={16} /></Button>
        <Button variant="ghost" aria-label="Print" onClick={() => { setSelected(row); setTimeout(() => printElement("receipt-print"), 100); }}><Printer size={16} /></Button>
        <Button variant="ghost" aria-label="Duplicate" onClick={() => duplicate(row)}><Copy size={16} /></Button>
        <Button variant="ghost" aria-label="Cancel" disabled={row.auditStatus === "Locked" || row.status === "Cancelled"} onClick={() => cancel(row)}><XCircle size={16} /></Button>
      </div>
    ) }
  ];

  return (
    <div className="stack">
      <PageHeader title="Offering Records" subtitle="Search, filter, print and cancel offering entries without permanently deleting records." actions={<Button variant="secondary" onClick={() => downloadCsv("offering-records.csv", rows)}><FileDown size={18} /> Export CSV</Button>} />
      <section className="filter-row">
        <Field label="Receipt or received from"><Input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></Field>
        <Field label="Year"><Input type="number" value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} /></Field>
        <Field label="Month"><Select value={filters.month} onChange={(e) => setFilters({ ...filters, month: e.target.value })}><option value="">All</option>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</Select></Field>
        <Field label="Payment mode"><Select value={filters.paymentMode} onChange={(e) => setFilters({ ...filters, paymentMode: e.target.value })}><option value="">All</option>{PAYMENT_MODES.map((mode) => <option key={mode}>{mode}</option>)}</Select></Field>
        <Field label="Audit status"><Select value={filters.auditStatus} onChange={(e) => setFilters({ ...filters, auditStatus: e.target.value })}><option value="">All</option>{AUDIT_STATUSES.map((status) => <option key={status}>{status}</option>)}</Select></Field>
      </section>
      <DataTable columns={columns} rows={rows} />
      {selected && (
        <Modal title="Offering Receipt" onClose={() => setSelected(null)} wide>
          <Receipt record={selected} settings={state.settings} />
          {selected.status === "Cancelled" && <div className="alert danger">Cancelled: {selected.cancellationReason}</div>}
        </Modal>
      )}
    </div>
  );
}
