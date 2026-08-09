import { Save } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/Button";
import { DataTable } from "../components/DataTable";
import { Field, Input, Select } from "../components/Field";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { ROLES } from "../data/constants";

export function UserManagement() {
  const { user } = useAuth();
  const { state, dispatch } = useData();
  const [form, setForm] = useState({ name: "", email: "", role: "Treasurer", active: true });

  function addUser() {
    if (!form.name || !form.email) return;
    const record = { id: crypto.randomUUID(), churchId: "bethel-sda", ...form };
    dispatch({ type: "ADD_USER", payload: record, log: { user: user.name, role: user.role, action: "User role changed", recordType: "User", recordId: record.id, newValue: `${record.email} ${record.role}` } });
    setForm({ name: "", email: "", role: "Treasurer", active: true });
  }

  return (
    <div className="stack">
      <PageHeader title="User Management" subtitle="Manage assigned church users and roles. Passwords remain in Firebase Authentication." />
      <section className="form-card">
        <div className="form-grid">
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Role"><Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{ROLES.map((role) => <option key={role}>{role}</option>)}</Select></Field>
          <Field label="Status"><Select value={form.active ? "active" : "inactive"} onChange={(e) => setForm({ ...form, active: e.target.value === "active" })}><option value="active">Active</option><option value="inactive">Inactive</option></Select></Field>
        </div>
        <Button onClick={addUser}><Save size={18} /> Add User</Button>
      </section>
      <DataTable
        rows={state.users}
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "role", label: "Role" },
          { key: "active", label: "Status", render: (row) => row.active ? "Active" : "Inactive" },
          { key: "actions", label: "Actions", render: (row) => (
            <Select value={row.role} onChange={(e) => dispatch({ type: "UPDATE_USER", payload: { ...row, role: e.target.value }, log: { user: user.name, role: user.role, action: "User role changed", recordType: "User", recordId: row.id, newValue: e.target.value } })}>
              {ROLES.map((role) => <option key={role}>{role}</option>)}
            </Select>
          ) }
        ]}
      />
    </div>
  );
}
