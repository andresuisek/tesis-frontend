import { supabase, type Venta, type TipoComprobante } from "@/lib/supabase";
import { exportToExcel, type ExcelColumn } from "./export-excel";

const columns: ExcelColumn<Venta>[] = [
  { header: "Fecha", key: "fecha_emision", format: "date", width: 12 },
  { header: "RUC Cliente", key: "ruc_cliente", width: 16 },
  { header: "Cliente", key: "razon_social_cliente", width: 30 },
  { header: "Comprobante", key: "numero_comprobante", width: 20 },
  { header: "Subtotal 0%", key: "subtotal_0", format: "currency" },
  { header: "Subtotal 5%", key: "subtotal_5", format: "currency" },
  { header: "Subtotal 8%", key: "subtotal_8", format: "currency" },
  { header: "Subtotal 15%", key: "subtotal_15", format: "currency" },
  { header: "IVA", key: "iva", format: "currency" },
  { header: "Total", key: "total", format: "currency" },
];

interface FetchVentasExportParams {
  ruc: string;
  periodStart: string;
  periodEnd: string;
  tipoComprobante?: TipoComprobante | null;
  busqueda?: string;
  fechaDesde?: string | null;
  fechaHasta?: string | null;
}

export async function exportVentasExcel({
  ruc,
  periodStart,
  periodEnd,
  tipoComprobante,
  busqueda,
  fechaDesde,
  fechaHasta,
}: FetchVentasExportParams, periodoLabel: string) {
  let query = supabase
    .from("ventas")
    .select("*")
    .eq("contribuyente_ruc", ruc)
    .gte("fecha_emision", periodStart)
    .lte("fecha_emision", periodEnd)
    .order("fecha_emision", { ascending: false });

  if (tipoComprobante) query = query.eq("tipo_comprobante", tipoComprobante);
  if (busqueda) {
    const term = `%${busqueda}%`;
    query = query.or(`razon_social_cliente.ilike.${term},ruc_cliente.ilike.${term}`);
  }
  if (fechaDesde) query = query.gte("fecha_emision", fechaDesde);
  if (fechaHasta) query = query.lte("fecha_emision", fechaHasta);

  const { data, error } = await query;
  if (error) throw error;

  const ventas = (data ?? []) as Venta[];

  const totals = ventas.reduce(
    (acc, v) => ({
      subtotal_0: acc.subtotal_0 + (v.subtotal_0 ?? 0),
      subtotal_5: acc.subtotal_5 + (v.subtotal_5 ?? 0),
      subtotal_8: acc.subtotal_8 + (v.subtotal_8 ?? 0),
      subtotal_15: acc.subtotal_15 + (v.subtotal_15 ?? 0),
      iva: acc.iva + (v.iva ?? 0),
      total: acc.total + (v.total ?? 0),
    }),
    { subtotal_0: 0, subtotal_5: 0, subtotal_8: 0, subtotal_15: 0, iva: 0, total: 0 }
  );

  exportToExcel({
    data: ventas,
    columns,
    sheetName: "Ventas",
    fileName: `Ventas_${periodoLabel.replace(/\s+/g, "_")}`,
    totals,
  });
}
