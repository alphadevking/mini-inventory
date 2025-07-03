import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportToExcel(data: any[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportToCSV(data: any[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function exportToPDF(data: any[], columns: { header: string; dataKey: string }[], filename: string) {
  const doc = new jsPDF();
  autoTable(doc, {
    columns,
    body: data,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] },
  });
  doc.save(`${filename}.pdf`);
}