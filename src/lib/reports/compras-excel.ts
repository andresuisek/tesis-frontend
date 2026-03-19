import { supabase, type Compra, type RubroCompra, type TipoComprobante } from "@/lib/supabase";
import { exportToExcel, type ExcelColumn } from "./export-excel";

const RUBRO_LABELS: Record<RubroCompra, string> = {
  no_definido: "No definido",
  vivienda: "Vivienda",
  alimentacion: "Alimentacion",
  salud: "Salud",
  educacion: "Educacion",
  vestimenta: "Vestimenta",
  turismo: "Turismo",
  actividad_profesional: "Actividad profesional",
};

const columns: ExcelColumn<Compra & { rubro_label: string }>[] = [
  { header: "Fecha", key: "fecha_emision", format: "date", width: 12 },
  { header: "RUC Proveedor", key: "ruc_proveedor", width: 16 },
  { header: "Proveedor", key: "razon_social_proveedor", width: 30 },
  { header: "Comprobante", key: "numero_comprobante", width: 20 },
  { header: "Rubro", key: "rubro_label", width: 20 },
  { header: "Subtotal 0%", key: "subtotal_0", format: "currency" },
  { header: "Subtotal 5%", key: "subtotal_5", format: "currency" },
  { header: "Subtotal 8%", key: "subtotal_8", format: "currency" },
  { header: "Subtotal 15%", key: "subtotal_15", format: "currency" },
  { header: "IVA", key: "iva", format: "currency" },
  { header: "Total", key: "total", format: "currency" },
];

interface FetchComprasExportParams {
  ruc: string;
  periodStart: string;
  periodEnd: string;
  rubro?: RubroCompra | null;
  tipoComprobante?: TipoComprobante | null;
  busqueda?: string;
  fechaDesde?: string | null;
  fechaHasta?: string | null;
}

export async function exportComprasExcel({
  ruc,
  periodStart,
  periodEnd,
  rubro,
  tipoComprobante,
  busqueda,
  fechaDesde,
  fechaHasta,
}: FetchComprasExportParams, periodoLabel: string) {
  let query = supabase
    .from("compras")
    .select("*")
    .eq("contribuyente_ruc", ruc)
    .gte("fecha_emision", periodStart)
    .lte("fecha_emision", periodEnd)
    .order("fecha_emision", { ascending: false });

  if (rubro) query = query.eq("rubro", rubro);
  if (tipoComprobante) query = query.eq("tipo_comprobante", tipoComprobante);
  if (busqueda) {
    const term = `%${busqueda}%`;
    query = query.or(`razon_social_proveedor.ilike.${term},ruc_proveedor.ilike.${term}`);
  }
  if (fechaDesde) query = query.gte("fecha_emision", fechaDesde);
  if (fechaHasta) query = query.lte("fecha_emision", fechaHasta);

  const { data, error } = await query;
  if (error) throw error;

  const compras = (data ?? []) as Compra[];

  const dataWithLabels = compras.map((c) => ({
    ...c,
    rubro_label: RUBRO_LABELS[c.rubro] ?? c.rubro,
  }));

  const totals = compras.reduce(
    (acc, c) => ({
      subtotal_0: acc.subtotal_0 + (c.subtotal_0 ?? 0),
      subtotal_5: acc.subtotal_5 + (c.subtotal_5 ?? 0),
      subtotal_8: acc.subtotal_8 + (c.subtotal_8 ?? 0),
      subtotal_15: acc.subtotal_15 + (c.subtotal_15 ?? 0),
      iva: acc.iva + (c.iva ?? 0),
      total: acc.total + (c.total ?? 0),
    }),
    { subtotal_0: 0, subtotal_5: 0, subtotal_8: 0, subtotal_15: 0, iva: 0, total: 0 }
  );

  exportToExcel({
    data: dataWithLabels,
    columns,
    sheetName: "Compras",
    fileName: `Compras_${periodoLabel.replace(/\s+/g, "_")}`,
    totals,
  });
}
