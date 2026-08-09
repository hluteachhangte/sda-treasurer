import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatINR } from "./fundReportCalculations";

export function downloadFundReportPdf({ report, period, churchName, generatedDate }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const margin = 42;
  let y = 42;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(churchName, doc.internal.pageSize.width / 2, y, { align: "center" });
  y += 18;
  doc.setFontSize(11);
  doc.text(period.title, doc.internal.pageSize.width / 2, y, { align: "center" });
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(period.subtitle, doc.internal.pageSize.width / 2, y, { align: "center" });
  y += 16;
  y += 8;

  y = addSection(doc, y, "SECTION A - 50% SHARED OFFERINGS", ["Offering", "Gross Collection", "Local Fund (50%)", "Mission Fund (50%)"], [
    ...report.summary.sectionA.rows.map((row) => [row.label, formatINR(row.gross), formatINR(row.localFund), formatINR(row.missionFund)]),
    ["TOTAL", formatINR(report.summary.sectionA.total.gross), formatINR(report.summary.sectionA.total.localFund), formatINR(report.summary.sectionA.total.missionFund)]
  ], [225, 105, 105, 105], [224, 236, 248]);

  y = addSection(doc, y, "SECTION B - 100% LOCAL FUND", ["Description", "Amount"], [
    ...report.summary.sectionB.rows.map((row) => [row.label, formatINR(row.amount)]),
    ["TOTAL 100% LOCAL FUND", formatINR(report.summary.sectionB.total)]
  ], [360, 180], [226, 243, 231]);

  y = addSection(doc, y, "SECTION C - 100% MISSION FUND", ["Description", "Amount"], [
    ...report.summary.sectionC.rows.map((row) => [row.label, formatINR(row.amount)]),
    ["TOTAL 100% MISSION FUND", formatINR(report.summary.sectionC.total)]
  ], [360, 180], [250, 240, 211]);

  y = addSection(doc, y, "SECTION D - FUND SUMMARY", ["Description", "Amount"], report.summary.rows.map((row) => [row.label, formatINR(row.amount)]), [360, 180], [18, 60, 105], true);

  y = addSection(doc, y, "SECTION E - CHURCH FINANCIAL STATUS", ["Description", "Amount"], report.summary.sectionE.rows.map((row) => [row.label, formatINR(row.amount)]), [360, 180], [232, 242, 250]);

  if (y > 660) {
    doc.addPage();
    y = margin;
  }
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  [["Prepared By:", "Treasurer"], ["Checked By:", "Auditor"], ["Verified By:", "Church Elder"]].forEach(([label, role], index) => {
    const x = margin + index * 170;
    doc.text(label, x, y);
    doc.line(x, y + 56, x + 130, y + 56);
    doc.setFont("helvetica", "bold");
    doc.text(role, x + 65, y + 66, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text("Date:", x, y + 84);
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.text(`Page ${page} of ${pageCount}`, doc.internal.pageSize.width - margin, doc.internal.pageSize.height - 24, { align: "right" });
  }

  doc.save(period.filename);
}

function addSection(doc, startY, title, head, body, widths, headerColor, darkHeader = false) {
  const pageHeight = doc.internal.pageSize.height;
  let y = startY;
  if (y > pageHeight - 170) {
    doc.addPage();
    y = 42;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setFillColor(...headerColor);
  doc.setTextColor(darkHeader ? 255 : 20);
  doc.rect(42, y, doc.internal.pageSize.width - 84, 18, "F");
  doc.text(title, 50, y + 12);
  doc.setTextColor(20);
  autoTable(doc, {
    startY: y + 24,
    head: [head],
    body,
    margin: { left: 42, right: 42 },
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [241, 246, 247], textColor: [18, 60, 105], fontStyle: "bold" },
    columnStyles: Object.fromEntries(widths.map((cellWidth, index) => [index, { cellWidth, halign: index === 0 ? "left" : "right" }])),
    didParseCell: (data) => {
      if (data.section === "head" && data.column.index > 0) {
        data.cell.styles.halign = "center";
      }
      const isTotal = String(data.row.raw?.[0] || "").startsWith("TOTAL") || String(data.row.raw?.[0] || "").startsWith("GRAND");
      if (data.section === "body" && isTotal) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [245, 247, 250];
      }
    }
  });
  return doc.lastAutoTable.finalY + 18;
}
