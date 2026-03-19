import { supabase, type NotaCredito } from "@/lib/supabase";
import { exportToExcel, type ExcelColumn } from "./export-excel";

const columns: ExcelColumn<NotaCredito>[] = [
  { header: "Fecha", key: "fecha_emision", format: "date", width: 12 },
  { header: "Comprobante", key: "numero_comprobante", width: 22 },
  { header: "Subtotal 0%", key: "subtotal_0", format: "currency" },
  { header: "Subtotal 5%", key: "subtotal_5", format: "currency" },
  { header: "Subtotal 8%", key: "subtotal_8", format: "currency" },
  { header: "Subtotal 15%", key: "subtotal_15", format: "currency" },
  { header: "IVA", key: "iva", format: "currency" },
  { header: "Total", key: "total", format: "currency" },
];

interface FetchNotasCreditoExportParams {
  ruc: string;
  periodStart: string;
  periodEnd: string;
  busqueda?: string;
  fechaDesde?: string | null;
  fechaHasta?: string | null;
}

export async function exportNotasCreditoExcel({
  ruc,
  periodStart,
  periodEnd,
  busqueda,
  fechaDesde,
  fechaHasta,
}: FetchNotasCreditoExportParams, periodoLabel: string) {
  let query = supabase
    .from("notas_credito")
    .select("*")
    .eq("contribuyente_ruc", ruc)
    .gte("fecha_emision", periodStart)
    .lte("fecha_emision", periodEnd)
    .order("fecha_emision", { ascending: false });

  if (busqueda) {
    const term = `%${busqueda}%`;
    query = query.ilike("numero_comprobante", term);
  }
  if (fechaDesde) query = query.gte("fecha_emision", fechaDesde);
  if (fechaHasta) query = query.lte("fecha_emision", fechaHasta);

  const { data, error } = await query;
  if (error) throw error;

  const notas = (data ?? []) as NotaCredito[];

  const totals = notas.reduce(
    (acc, n) => ({
      subtotal_0: acc.subtotal_0 + (n.subtotal_0 ?? 0),
      subtotal_5: acc.subtotal_5 + (n.subtotal_5 ?? 0),
      subtotal_8: acc.subtotal_8 + (n.subtotal_8 ?? 0),
      subtotal_15: acc.subtotal_15 + (n.subtotal_15 ?? 0),
      iva: acc.iva + (n.iva ?? 0),
      total: acc.total + (n.total ?? 0),
    }),
    { subtotal_0: 0, subtotal_5: 0, subtotal_8: 0, subtotal_15: 0, iva: 0, total: 0 }
  );

  exportToExcel({
    data: notas,
    columns,
    sheetName: "Notas de Credito",
    fileName: `NotasCredito_${periodoLabel.replace(/\s+/g, "_")}`,
    totals,
  });
}
