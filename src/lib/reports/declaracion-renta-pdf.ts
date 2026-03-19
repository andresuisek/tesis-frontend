import { formatCurrency } from "@/lib/liquidacion";
import {
  type DeclaracionRentaSummaryData,
  formatFechaLimite,
} from "@/lib/declaracion-renta";

export async function exportDeclaracionRentaPDF(
  resumen: DeclaracionRentaSummaryData,
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
      marginTop: 14,
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
    value: { width: 100, textAlign: "right", fontFamily: "Helvetica-Bold" },
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
      width: 100,
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
    // Gastos table
    tableHeader: {
      flexDirection: "row",
      paddingVertical: 4,
      paddingHorizontal: 4,
      backgroundColor: "#333",
      color: "#fff",
    },
    thText: { fontFamily: "Helvetica-Bold", color: "#fff" },
    thCol1: { flex: 1 },
    thCol2: { width: 80, textAlign: "right" },
    thCol3: { width: 80, textAlign: "right" },
    thCol4: { width: 80, textAlign: "right" },
    tdCol1: { flex: 1 },
    tdCol2: { width: 80, textAlign: "right" },
    tdCol3: { width: 80, textAlign: "right" },
    tdCol4: { width: 80, textAlign: "right" },
  });

  const makeRow = (label: string, value: string, alt: boolean) =>
    h(View, { style: alt ? styles.rowAlt : styles.row, key: label },
      h(Text, { style: styles.label }, label),
      h(Text, { style: styles.value }, value),
    );

  const calc = resumen.calculo;
  const gp = calc.gastosPersonales;
  const fechaGeneracion = new Date().toLocaleDateString("es-EC");

  const gastosCategorias = [
    { nombre: "Vivienda", cat: gp.vivienda },
    { nombre: "Alimentacion", cat: gp.alimentacion },
    { nombre: "Educacion", cat: gp.educacion },
    { nombre: "Vestimenta", cat: gp.vestimenta },
    { nombre: "Salud", cat: gp.salud },
    { nombre: "Turismo", cat: gp.turismo },
  ];

  const doc = h(
    Document,
    null,
    h(
      Page,
      { size: "A4", style: styles.page },
      // Header
      h(View, { style: styles.header },
        h(Text, { style: styles.title }, "Declaracion Anual de Impuesto a la Renta"),
        h(Text, { style: styles.subtitle }, `Ano Fiscal: ${resumen.anioFiscal}`),
        h(Text, { style: styles.info }, `Contribuyente: ${contribuyenteNombre}`),
        h(Text, { style: styles.info }, `RUC: ${ruc}`),
        h(Text, { style: styles.info }, `Fecha limite: ${formatFechaLimite(resumen.fechaLimite)}`),
        h(Text, { style: styles.info }, `Generado: ${fechaGeneracion}`),
      ),

      // Ingresos y Costos
      h(Text, { style: styles.sectionTitle }, "Ingresos y Costos"),
      makeRow("Ingresos Brutos", formatCurrency(calc.ingresosBrutos), false),
      makeRow("(-) Costos y Gastos Deducibles", formatCurrency(calc.costosGastosDeducibles), true),
      makeRow("Utilidad del Ejercicio", formatCurrency(calc.utilidadEjercicio), false),

      // Gastos Personales
      h(Text, { style: styles.sectionTitle }, "Gastos Personales Deducibles"),
      // Table header
      h(View, { style: styles.tableHeader },
        h(Text, { style: { ...styles.thText, ...styles.thCol1 } }, "Categoria"),
        h(Text, { style: { ...styles.thText, ...styles.thCol2 } }, "Gasto Real"),
        h(Text, { style: { ...styles.thText, ...styles.thCol3 } }, "Limite"),
        h(Text, { style: { ...styles.thText, ...styles.thCol4 } }, "Deducible"),
      ),
      // Table rows
      ...gastosCategorias.map((g, i) =>
        h(View, { style: i % 2 === 0 ? styles.row : styles.rowAlt, key: g.nombre },
          h(Text, { style: styles.tdCol1 }, g.nombre),
          h(Text, { style: styles.tdCol2 }, formatCurrency(g.cat.real)),
          h(Text, { style: styles.tdCol3 }, formatCurrency(g.cat.limite)),
          h(Text, { style: styles.tdCol4 }, formatCurrency(g.cat.deducible)),
        )
      ),
      // Totals row
      h(View, { style: styles.totalRow },
        h(Text, { style: styles.totalLabel }, "Total"),
        h(Text, { style: styles.tdCol2 }, formatCurrency(gp.totalReal)),
        h(Text, { style: styles.tdCol3 }, formatCurrency(gp.topeTotal)),
        h(Text, { style: { ...styles.tdCol4, fontFamily: "Helvetica-Bold" } }, formatCurrency(gp.totalDeducible)),
      ),

      // Calculo del Impuesto
      h(Text, { style: styles.sectionTitle }, "Calculo del Impuesto"),
      makeRow("Base Imponible", formatCurrency(calc.baseImponible), false),
      makeRow("Impuesto Causado", formatCurrency(calc.impuestoCausado), true),
      makeRow("(-) Retenciones en la Fuente", formatCurrency(calc.retencionesRenta), false),

      // Resultado
      h(View, { style: styles.resultBox },
        h(Text, { style: styles.resultTitle },
          calc.impuestoAPagar >= 0 ? "Impuesto a Pagar" : "Saldo a Favor"
        ),
        h(View, { style: styles.totalRow },
          h(Text, { style: styles.totalLabel },
            calc.impuestoAPagar >= 0
              ? "Total a pagar"
              : "Credito a favor del contribuyente"
          ),
          h(Text, { style: styles.totalValue },
            formatCurrency(Math.abs(calc.impuestoAPagar))
          ),
        ),
      ),

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
  link.download = `Declaracion_Renta_${resumen.anioFiscal}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
