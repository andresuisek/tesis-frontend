import { supabase, type Retencion } from "@/lib/supabase";
import { exportToExcel, type ExcelColumn } from "./export-excel";

const columns: ExcelColumn<Retencion>[] = [
  { header: "Fecha", key: "fecha_emision", format: "date", width: 12 },
  { header: "RUC Agente Retencion", key: "ruc_agente_retencion", format: "text", width: 16 },
  { header: "Agente de Retencion", key: "razon_social_agente", width: 30 },
  { header: "Serie Comprobante", key: "serie_comprobante", format: "text", width: 22 },
  { header: "Clave de Acceso", key: "clave_acceso", format: "text", width: 50 },
  { header: "% Ret. IVA", key: "retencion_iva_percent", format: "percent", width: 12 },
  { header: "Valor Ret. IVA", key: "retencion_valor", format: "currency" },
  { header: "% Ret. Renta", key: "retencion_renta_percent", format: "percent", width: 12 },
  { header: "Valor Ret. Renta", key: "retencion_renta_valor", format: "currency" },
];

interface FetchRetencionesExportParams {
  ruc: string;
  periodStart: string;
  periodEnd: string;
  busqueda?: string;
  fechaDesde?: string | null;
  fechaHasta?: string | null;
}

export async function exportRetencionesExcel({
  ruc,
  periodStart,
  periodEnd,
  busqueda,
  fechaDesde,
  fechaHasta,
}: FetchRetencionesExportParams, periodoLabel: string) {
  // User-selected date filters override the global period bounds so that
  // picking a range outside the period still exports the expected rows.
  const effectiveStart = fechaDesde ?? periodStart;
  const effectiveEnd = fechaHasta ?? periodEnd;

  let query = supabase
    .from("retenciones")
    .select("*")
    .eq("contribuyente_ruc", ruc)
    .gte("fecha_emision", effectiveStart)
    .lte("fecha_emision", effectiveEnd)
    .order("fecha_emision", { ascending: false });

  if (busqueda) {
    const term = `%${busqueda}%`;
    query = query.or(`serie_comprobante.ilike.${term},clave_acceso.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const retenciones = (data ?? []) as Retencion[];

  const totals = retenciones.reduce(
    (acc, r) => ({
      retencion_valor: acc.retencion_valor + (r.retencion_valor ?? 0),
      retencion_renta_valor: acc.retencion_renta_valor + (r.retencion_renta_valor ?? 0),
    }),
    { retencion_valor: 0, retencion_renta_valor: 0 }
  );

  exportToExcel({
    data: retenciones,
    columns,
    sheetName: "Retenciones",
    fileName: `Retenciones_${periodoLabel.replace(/\s+/g, "_")}`,
    totals,
  });
}
