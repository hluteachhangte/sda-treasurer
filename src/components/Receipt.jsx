import { OFFERING_CATEGORIES } from "../data/constants";
import { amountInWords, money } from "../utils/calculations";

export function Receipt({ record, settings }) {
  if (!record) return null;
  return (
    <article className="receipt" id="receipt-print">
      <header className="receipt-header">
        <div className="receipt-logo">B</div>
        <div>
          <h2>{settings.churchName}</h2>
          <p>{settings.churchAddress}</p>
        </div>
      </header>
      <div className="receipt-meta">
        <span>Receipt: <strong>{record.receiptNumber}</strong></span>
        <span>Date: <strong>{record.date}</strong></span>
        <span>Payment: <strong>{record.paymentMode}</strong></span>
      </div>
      <p>Received from <strong>{record.receivedFrom}</strong></p>
      <table className="receipt-table">
        <tbody>
          {OFFERING_CATEGORIES.filter((cat) => Number(record.offerings?.[cat.key]) > 0).map((cat) => (
            <tr key={cat.key}>
              <td>{cat.label}</td>
              <td>{money(record.offerings[cat.key], settings.currencySymbol)}</td>
            </tr>
          ))}
          <tr>
            <th>Total Amount</th>
            <th>{money(record.grossOfferingTotal, settings.currencySymbol)}</th>
          </tr>
        </tbody>
      </table>
      <p className="receipt-words">{amountInWords(record.grossOfferingTotal)}</p>
      <div className="receipt-grid">
        <span>Treasurer: {settings.treasurerName}</span>
        <span>Verification: {record.id.slice(0, 12).toUpperCase()}</span>
      </div>
      <footer className="signature-row">
        <span>Treasurer Signature</span>
        <span>Church Seal</span>
      </footer>
      <small>Printed: {new Date().toLocaleString("en-IN")}</small>
    </article>
  );
}
