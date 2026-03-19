import { formatCurrency } from "@/lib/liquidacion";
import type { Compra, RubroCompra } from "@/lib/supabase";

const RUBRO_LABELS: Record<RubroCompra, string> = {
  no_definido: "No definido",
  vivienda: "Vivienda",
  alimentacion: "Alimentacion",
  salud: "Salud",
  educacion: "Educacion",
  vestimenta: "Vestimenta",
  turismo: "Turismo",
  actividad_profesional: "Actividad Profesional",
};

const RUBROS_PERSONALES: RubroCompra[] = [
  "vivienda",
  "alimentacion",
  "educacion",
  "salud",
  "vestimenta",
  "turismo",
];

// Límites de gastos personales según cargas familiares (Ecuador 2025)
const LIMITES_GASTOS_PERSONALES: Record<number, number> = {
  0: 5588.17,
  1: 7184.79,
  2: 8781.41,
  3: 11176.34,
  4: 13571.27,
  5: 15966.20,
};

export async function exportGastosPersonalesPDF(
  compras: Compra[],
  cargasFamiliares: number,
  contribuyenteNombre: string,
  ruc: string,
  periodoLabel: string
) {
  const { Document, Page, Text, View, StyleSheet, pdf } = await import(
    "@react-pdf/renderer"
  );
  const { createElement: h } = await import("react");

  // Calculate totals by rubro
  const totalesPorRubro: Record<string, number> = {};
  for (const c of compras) {
    const rubro = c.rubro ?? "no_definido";
    totalesPorRubro[rubro] = (totalesPorRubro[rubro] ?? 0) + (c.total ?? 0);
  }

  const limiteTotal =
    LIMITES_GASTOS_PERSONALES[
      Math.min(cargasFamiliares, 5)
    ] ?? LIMITES_GASTOS_PERSONALES[0];

  const totalGastosPersonales = RUBROS_PERSONALES.reduce(
    (sum, r) => sum + (totalesPorRubro[r] ?? 0),
    0
  );
  const porcentajeUso =
    limiteTotal > 0
      ? Math.min(100, (totalGastosPersonales / limiteTotal) * 100)
      : 0;

  const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 9, fontFamily: "Helvetica" },
    header: { marginBottom: 20, textAlign: "center" },
    title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 4 },
    subtitle: { fontSize: 11, color: "#555", marginBottom: 2 },
    info: { fontSize: 9, color: "#777" },
    sectionTitle: {
      fontSize: 11,
      fontFamily: "Helvetica-Bold",
      marginTop: 14,
      marginBottom: 6,
      paddingBottom: 3,
      borderBottomWidth: 1,
      borderBottomColor: "#ddd",
    },
    tableHeader: {
      flexDirection: "row",
      paddingVertical: 6,
      paddingHorizontal: 6,
      backgroundColor: "#333",
    },
    thText: { fontFamily: "Helvetica-Bold", color: "#fff" },
    row: {
      flexDirection: "row",
      paddingVertical: 5,
      paddingHorizontal: 6,
      borderBottomWidth: 1,
      borderBottomColor: "#eee",
    },
    rowAlt: {
      flexDirection: "row",
      paddingVertical: 5,
      paddingHorizontal: 6,
      backgroundColor: "#f8f8f8",
      borderBottomWidth: 1,
      borderBottomColor: "#eee",
    },
    col1: { flex: 1 },
    col2: { width: 80, textAlign: "right" },
    col3: { width: 80, textAlign: "right" },
    col4: { width: 80, textAlign: "right" },
    totalRow: {
      flexDirection: "row",
      paddingVertical: 6,
      paddingHorizontal: 6,
      borderTopWidth: 2,
      borderTopColor: "#333",
      marginTop: 2,
    },
    totalLabel: { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 10 },
    totalValue: {
      width: 80,
      textAlign: "right",
      fontFamily: "Helvetica-Bold",
      fontSize: 10,
    },
    summaryBox: {
      marginTop: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: "#333",
      borderRadius: 4,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 3,
    },
    summaryLabel: { fontSize: 10 },
    summaryValue: { fontSize: 10, fontFamily: "Helvetica-Bold" },
    footer: {
      position: "absolute",
      bottom: 30,
      left: 40,
      right: 40,
      textAlign: "center",
      fontSize: 8,
      color: "#999",
    },
    progressBarBg: {
      marginTop: 8,
      height: 12,
      backgroundColor: "#e0e0e0",
      borderRadius: 6,
    },
    progressBarFill: {
      height: 12,
      borderRadius: 6,
    },
  });

  const fechaGeneracion = new Date().toLocaleDateString("es-EC");

  const doc = h(
    Document,
    null,
    h(
      Page,
      { size: "A4", style: styles.page },
      // Header
      h(View, { style: styles.header },
        h(Text, { style: styles.title }, "Resumen de Gastos Personales"),
        h(Text, { style: styles.subtitle }, `Periodo: ${periodoLabel}`),
        h(Text, { style: styles.info }, `Contribuyente: ${contribuyenteNombre}`),
        h(Text, { style: styles.info }, `RUC: ${ruc}`),
        h(Text, { style: styles.info }, `Cargas familiares: ${cargasFamiliares}`),
        h(Text, { style: styles.info }, `Generado: ${fechaGeneracion}`),
      ),

      // Desglose por categoría
      h(Text, { style: styles.sectionTitle }, "Desglose por Categoria"),

      // Table header
      h(View, { style: styles.tableHeader },
        h(Text, { style: { ...styles.thText, ...styles.col1 } }, "Categoria"),
        h(Text, { style: { ...styles.thText, ...styles.col2 } }, "Monto"),
        h(Text, { style: { ...styles.thText, ...styles.col3 } }, "# Compras"),
        h(Text, { style: { ...styles.thText, ...styles.col4 } }, "% del Total"),
      ),

      // Table rows
      ...RUBROS_PERSONALES.map((rubro, i) => {
        const monto = totalesPorRubro[rubro] ?? 0;
        const count = compras.filter((c) => c.rubro === rubro).length;
        const pct =
          totalGastosPersonales > 0
            ? ((monto / totalGastosPersonales) * 100).toFixed(1) + "%"
            : "0%";
        return h(View, { style: i % 2 === 0 ? styles.row : styles.rowAlt, key: rubro },
          h(Text, { style: styles.col1 }, RUBRO_LABELS[rubro]),
          h(Text, { style: styles.col2 }, formatCurrency(monto)),
          h(Text, { style: styles.col3 }, String(count)),
          h(Text, { style: styles.col4 }, pct),
        );
      }),

      // Total row
      h(View, { style: styles.totalRow },
        h(Text, { style: styles.totalLabel }, "Total Gastos Personales"),
        h(Text, { style: styles.totalValue }, formatCurrency(totalGastosPersonales)),
        h(Text, { style: styles.col3 }, ""),
        h(Text, { style: { ...styles.col4, fontFamily: "Helvetica-Bold" } }, "100%"),
      ),

      // Summary box
      h(View, { style: styles.summaryBox },
        h(View, { style: styles.summaryRow },
          h(Text, { style: styles.summaryLabel }, "Limite maximo deducible:"),
          h(Text, { style: styles.summaryValue }, formatCurrency(limiteTotal)),
        ),
        h(View, { style: styles.summaryRow },
          h(Text, { style: styles.summaryLabel }, "Total gastos personales:"),
          h(Text, { style: styles.summaryValue }, formatCurrency(totalGastosPersonales)),
        ),
        h(View, { style: styles.summaryRow },
          h(Text, { style: styles.summaryLabel }, "Porcentaje de uso:"),
          h(Text, { style: styles.summaryValue }, `${porcentajeUso.toFixed(1)}%`),
        ),
        // Visual progress bar
        h(View, { style: styles.progressBarBg },
          h(View, {
            style: {
              ...styles.progressBarFill,
              width: `${Math.min(100, porcentajeUso)}%`,
              backgroundColor: porcentajeUso >= 90 ? "#ef4444" : porcentajeUso >= 70 ? "#f59e0b" : "#22c55e",
            },
          }),
        ),
      ),

      // Otros gastos (no personales)
      ...(totalesPorRubro["actividad_profesional"] || totalesPorRubro["no_definido"]
        ? [
            h(Text, { style: styles.sectionTitle, key: "otros-title" }, "Otros Gastos (No Deducibles como Personales)"),
            ...(totalesPorRubro["actividad_profesional"]
              ? [
                  h(View, { style: styles.row, key: "act_prof" },
                    h(Text, { style: styles.col1 }, "Actividad Profesional"),
                    h(Text, { style: styles.col2 }, formatCurrency(totalesPorRubro["actividad_profesional"])),
                  ),
                ]
              : []),
            ...(totalesPorRubro["no_definido"]
              ? [
                  h(View, { style: styles.rowAlt, key: "no_def" },
                    h(Text, { style: styles.col1 }, "No Definido"),
                    h(Text, { style: styles.col2 }, formatCurrency(totalesPorRubro["no_definido"])),
                  ),
                ]
              : []),
          ]
        : []),

      // Footer
      h(View, { style: styles.footer },
        h(Text, null, "Documento generado automaticamente por el Sistema de Gestion Tributaria"),
      ),
    )
  );

  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Gastos_Personales_${periodoLabel.replace(/\s+/g, "_")}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
