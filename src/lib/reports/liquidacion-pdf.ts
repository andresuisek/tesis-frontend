import { formatCurrency, type LiquidacionSummaryData } from "@/lib/liquidacion";

export async function exportLiquidacionPDF(
  resumen: LiquidacionSummaryData,
  contribuyenteNombre: string,
  ruc: string
) {
  const { Document, Page, Text, View, StyleSheet, pdf } = await import(
    "@react-pdf/renderer"
  );
  const { createElement: h } = await import("react");

  const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 9, fontFamily: "Helvetica" },
    header: { marginBottom: 20, textAlign: "center" },
    title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 4 },
    subtitle: { fontSize: 11, color: "#555", marginBottom: 2 },
    info: { fontSize: 9, color: "#777" },
    sectionTitle: {
      fontSize: 11,
      fontFamily: "Helvetica-Bold",
      marginTop: 16,
      marginBottom: 6,
      paddingBottom: 3,
      borderBottomWidth: 1,
      borderBottomColor: "#ddd",
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 3,
      paddingHorizontal: 4,
    },
    rowAlt: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 3,
      paddingHorizontal: 4,
      backgroundColor: "#f8f8f8",
    },
    label: { flex: 1 },
    value: { width: 90, textAlign: "right", fontFamily: "Helvetica-Bold" },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 5,
      paddingHorizontal: 4,
      borderTopWidth: 2,
      borderTopColor: "#333",
      marginTop: 4,
    },
    totalLabel: { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 10 },
    totalValue: {
      width: 90,
      textAlign: "right",
      fontFamily: "Helvetica-Bold",
      fontSize: 10,
    },
    footer: {
      position: "absolute",
      bottom: 30,
      left: 40,
      right: 40,
      textAlign: "center",
      fontSize: 8,
      color: "#999",
    },
    resultBox: {
      marginTop: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: "#333",
      borderRadius: 4,
    },
    resultTitle: {
      fontSize: 12,
      fontFamily: "Helvetica-Bold",
      marginBottom: 6,
      textAlign: "center",
    },
  });

  const makeRow = (label: string, value: string, alt: boolean) =>
    h(View, { style: alt ? styles.rowAlt : styles.row, key: label },
      h(Text, { style: styles.label }, label),
      h(Text, { style: styles.value }, value),
    );

  const v = resumen.ventas;
  const c = resumen.compras;
  const calc = resumen.calculo;
  const fechaGeneracion = new Date().toLocaleDateString("es-EC");

  const doc = h(
    Document,
    null,
    h(
      Page,
      { size: "A4", style: styles.page },
      // Header
      h(View, { style: styles.header },
        h(Text, { style: styles.title }, "Liquidacion de Impuesto al Valor Agregado (IVA)"),
        h(Text, { style: styles.subtitle }, `Periodo: ${resumen.periodo.label}`),
        h(Text, { style: styles.info }, `Contribuyente: ${contribuyenteNombre}`),
        h(Text, { style: styles.info }, `RUC: ${ruc}`),
        h(Text, { style: styles.info }, `Generado: ${fechaGeneracion}`),
      ),

      // Ventas
      h(Text, { style: styles.sectionTitle }, "Ventas del Periodo"),
      makeRow("Base Imponible 0%", formatCurrency(v.base0), false),
      makeRow("Base Imponible 5%", formatCurrency(v.base5), true),
      makeRow("Base Imponible 8%", formatCurrency(v.base8), false),
      makeRow("Base Imponible 15%", formatCurrency(v.base15), true),
      makeRow("IVA Generado en Ventas", formatCurrency(calc.ivaVentasTotal), false),

      // Compras
      h(Text, { style: styles.sectionTitle }, "Compras del Periodo"),
      makeRow("Base Imponible 0%", formatCurrency(c.base0), false),
      makeRow("Base Imponible 5%", formatCurrency(c.base5), true),
      makeRow("Base Imponible 8%", formatCurrency(c.base8), false),
      makeRow("Base Imponible 15%", formatCurrency(c.base15), true),
      makeRow("IVA Pagado en Compras", formatCurrency(calc.ivaComprasTotal), false),

      // Calculo IVA
      h(Text, { style: styles.sectionTitle }, "Calculo del Impuesto"),
      makeRow("IVA Ventas (cobrado)", formatCurrency(calc.ivaVentasPeriodo), false),
      makeRow("(-) IVA Compras (pagado)", formatCurrency(calc.ivaComprasTotal), true),
      makeRow("Impuesto Causado", formatCurrency(calc.impuestoCausado), false),
      makeRow("(-) Credito tributario por adquisicion", formatCurrency(calc.ctAdquisicionUsado), true),
      makeRow("(-) Credito tributario por retencion", formatCurrency(calc.ctRetencionUsado), false),

      // Resultado
      h(View, { style: styles.resultBox },
        h(Text, { style: styles.resultTitle },
          calc.ivaAPagar > 0 ? "Impuesto a Pagar" : "Saldo a Favor"
        ),
        h(View, { style: styles.totalRow },
          h(Text, { style: styles.totalLabel },
            calc.ivaAPagar > 0 ? "IVA a pagar al SRI" : "Credito tributario a favor"
          ),
          h(Text, { style: styles.totalValue },
            calc.ivaAPagar > 0
              ? formatCurrency(calc.totalAPagar)
              : formatCurrency(calc.saldoAFavor)
          ),
        ),
      ),

      // Credito tributario que arrastra
      h(Text, { style: styles.sectionTitle }, "Credito Tributario que Arrastra"),
      makeRow("CT por Adquisicion", formatCurrency(resumen.creditoTributario.ctPorAdquisicion), false),
      makeRow("CT por Retencion", formatCurrency(resumen.creditoTributario.ctPorRetencion), true),

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
  link.download = `Liquidacion_IVA_${resumen.periodo.periodoId}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
