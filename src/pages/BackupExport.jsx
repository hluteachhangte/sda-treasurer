import { Download, Upload } from "lucide-react";
import { Button } from "../components/Button";
import { DataTable } from "../components/DataTable";
import { Field, Input } from "../components/Field";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { downloadJson } from "../utils/exporters";

export function BackupExport() {
  const { user } = useAuth();
  const { state, dispatch } = useData();
  const rows = [
    { id: "offerings", dataset: "Offerings", count: state.offerings.length },
    { id: "localFundEntries", dataset: "Local Fund Entries", count: state.localFundEntries?.length || 0 },
    { id: "localFund100Entries", dataset: "Local Fund 100% Entries", count: state.localFund100Entries?.length || 0 },
    { id: "missionFundEntries", dataset: "Mission Fund Entries", count: state.missionFundEntries?.length || 0 },
    { id: "expenditures", dataset: "Expenditures", count: state.expenditures.length },
    { id: "remittances", dataset: "Remittances", count: state.remittances.length },
    { id: "auditLogs", dataset: "Audit Logs", count: state.auditLogs.length },
    { id: "users", dataset: "Users", count: state.users.length }
  ];

  function restore(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = JSON.parse(reader.result);
      const confirmed = window.confirm(`Restore backup with ${parsed.offerings?.length || 0} offerings and ${parsed.expenditures?.length || 0} expenditures?`);
      if (confirmed) {
        dispatch({ type: "RESTORE", payload: parsed, log: { user: user.name, role: user.role, action: "Backup restored", recordType: "Backup", recordId: file.name, reason: "Administrator confirmed restore" } });
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="stack">
      <PageHeader title="Backup and Export" subtitle="Download JSON backups and restore after confirmation with preview counts." />
      <section className="button-row">
        <Button onClick={() => downloadJson(`bethel-backup-${new Date().toISOString().slice(0, 10)}.json`, state)}><Download size={18} /> Export JSON Backup</Button>
        <Field label="Restore backup">
          <Input type="file" accept="application/json" onChange={restore} />
        </Field>
      </section>
      <DataTable rows={rows} columns={[{ key: "dataset", label: "Dataset" }, { key: "count", label: "Records" }]} />
      <div className="alert warning"><Upload size={18} /> Restore replaces the local working copy after confirmation. In Firebase, restrict restore to administrators only.</div>
    </div>
  );
}
