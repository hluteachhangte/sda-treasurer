import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { money } from "./calculations";

export function downloadCsv(filename, rows) {
  const headers = Object.keys(rows[0] || {});
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? "").replaceAll('"', '""')}"`).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, filename);
}

export function downloadJson(filename, payload) {
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), filename);
}

export function downloadExcel(filename, sheets) {
  const workbookHtml = Object.entries(sheets)
    .map(([name, rows]) => {
      const headers = Object.keys(rows[0] || {});
      return `
        <h2>${escapeHtml(name)}</h2>
        <table>
          <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
          <tbody>
            ${rows
              .map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join("")}</tr>`)
              .join("")}
          </tbody>
        </table>
      `;
    })
    .join("<br/>");
  const html = `<!doctype html><html><head><meta charset="utf-8"/></head><body>${workbookHtml}</body></html>`;
  downloadBlob(new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" }), filename.replace(/\.xlsx$/i, ".xls"));
}

export function downloadPdf({ title, subtitle, columns, rows, totals = [], settings, orientation = "portrait" }) {
  const doc = new jsPDF({ orientation, unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text(settings.churchName, 40, 40);
  doc.setFontSize(11);
  doc.text(title, 40, 60);
  if (subtitle) doc.text(subtitle, 40, 78);
  autoTable(doc, {
    startY: 96,
    head: [columns],
    body: rows,
    foot: totals.length ? [totals] : undefined,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [18, 60, 105] },
    didDrawPage: () => {
      const page = doc.internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8);
      doc.text(`${settings.pdfFooter || ""} | Page ${page}`, 40, doc.internal.pageSize.height - 24);
    }
  });
  const finalY = doc.lastAutoTable.finalY + 32;
  doc.setFontSize(10);
  doc.text("Prepared By", 40, finalY);
  doc.text("Checked By", 220, finalY);
  doc.text("Approved By", 400, finalY);
  doc.save(`${title.replaceAll(" ", "-").toLowerCase()}.pdf`);
}

export function printElement(elementId) {
  const target = document.getElementById(elementId);
  if (!target) return;
  const printWindow = window.open("", "_blank", "width=900,height=700");
  printWindow.document.write(`<html><head><title>Print</title><link rel="stylesheet" href="/src/styles.css"></head><body>${target.innerHTML}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function rowsForOfferings(offerings, categoryLabels = []) {
  return offerings.map((item) => ({
    Date: item.date,
    Receipt: item.receiptNumber,
    From: item.receivedFrom,
    ...Object.fromEntries(categoryLabels.map((cat) => [cat.label, money(item.offerings?.[cat.key])])),
    "Local Fund": money(item.totalLocalFund),
    "Mission Fund": money(item.totalMissionFund),
    Gross: money(item.grossOfferingTotal)
  }));
}
