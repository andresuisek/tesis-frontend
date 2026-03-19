import * as XLSX from "xlsx";

export interface ExcelColumn<T> {
  header: string;
  key: keyof T;
  format?: "currency" | "date" | "percent" | "text";
  width?: number;
}

interface ExportExcelOptions<T> {
  data: T[];
  columns: ExcelColumn<T>[];
  sheetName: string;
  fileName: string;
  totals?: Partial<Record<keyof T, number>>;
  totalsLabel?: string;
}

function formatValue<T>(value: unknown, format?: ExcelColumn<T>["format"]): string | number {
  if (value == null) return "";

  switch (format) {
    case "currency":
      return typeof value === "number" ? Math.round(value * 100) / 100 : 0;
    case "date": {
      if (typeof value !== "string") return "";
      const [y, m, d] = value.split("-");
      return `${d}/${m}/${y}`;
    }
    case "percent":
      return typeof value === "number" ? value : 0;
    default:
      return String(value);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exportToExcel<T extends Record<string, any>>({
  data,
  columns,
  sheetName,
  fileName,
  totals,
  totalsLabel = "TOTALES",
}: ExportExcelOptions<T>) {
  // Build header row
  const headers = columns.map((c) => c.header);

  // Build data rows
  const rows = data.map((item) =>
    columns.map((col) => formatValue(item[col.key], col.format))
  );

  // Add totals row if provided
  if (totals) {
    const totalsRow = columns.map((col, i) => {
      if (i === 0) return totalsLabel;
      const val = totals[col.key];
      return val != null ? Math.round(val * 100) / 100 : "";
    });
    rows.push(totalsRow);
  }

  // Create workbook
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Set column widths
  ws["!cols"] = columns.map((col) => ({
    wch: col.width ?? (col.format === "currency" ? 14 : 18),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Trigger download
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
