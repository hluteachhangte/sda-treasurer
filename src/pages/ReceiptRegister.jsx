import { FileDown } from "lucide-react";
import { Button } from "../components/Button";
import { DataTable } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { useData } from "../contexts/DataContext";
import { money } from "../utils/calculations";
import { downloadCsv } from "../utils/exporters";

export function ReceiptRegister() {
  const { state } = useData();
  const rows = state.offerings.map((item) => ({
    ...item,
    amount: money(item.grossOfferingTotal, state.settings.currencySymbol),
    cancellation: item.status === "Cancelled" ? `${item.cancellationReason} by ${item.cancelledBy}` : ""
  }));
  return (
    <div className="stack">
      <PageHeader title="Receipt Register" subtitle="Complete receipt ledger including cancelled receipts and audit status." actions={<Button variant="secondary" onClick={() => downloadCsv("receipt-register.csv", rows)}><FileDown size={18} /> Export CSV</Button>} />
      <DataTable
        rows={rows}
        columns={[
          { key: "date", label: "Date" },
          { key: "receiptNumber", label: "Receipt Number" },
          { key: "receivedFrom", label: "Received From" },
          { key: "amount", label: "Amount" },
          { key: "paymentMode", label: "Payment Mode" },
          { key: "status", label: "Status" },
          { key: "auditStatus", label: "Audit Status" },
          { key: "cancellation", label: "Cancellation" }
        ]}
      />
    </div>
  );
}
