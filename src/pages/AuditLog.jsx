import { DataTable } from "../components/DataTable";
import { Field, Input } from "../components/Field";
import { PageHeader } from "../components/PageHeader";
import { useData } from "../contexts/DataContext";
import { useState } from "react";

export function AuditLog() {
  const { state } = useData();
  const [search, setSearch] = useState("");
  const rows = state.auditLogs.filter((item) => `${item.user} ${item.role} ${item.action} ${item.recordType} ${item.recordId} ${item.reason}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="stack">
      <PageHeader title="Audit Log" subtitle="Immutable trail of financial, audit, user, settings and backup actions." />
      <Field label="Search audit logs"><Input value={search} onChange={(e) => setSearch(e.target.value)} /></Field>
      <DataTable
        rows={rows}
        columns={[
          { key: "date", label: "Date" },
          { key: "time", label: "Time" },
          { key: "user", label: "User" },
          { key: "role", label: "Role" },
          { key: "action", label: "Action" },
          { key: "recordType", label: "Record Type" },
          { key: "recordId", label: "Record ID" },
          { key: "previousValue", label: "Previous Value" },
          { key: "newValue", label: "New Value" },
          { key: "device", label: "Device or Browser" },
          { key: "reason", label: "Reason" }
        ]}
      />
    </div>
  );
}
