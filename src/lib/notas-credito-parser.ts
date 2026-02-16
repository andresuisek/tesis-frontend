import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

/**
 * Interfaz para una nota de crédito parseada del archivo TXT del SRI
 */
export interface NotaCreditoParsed {
  fecha_emision: string; // En formato YYYY-MM-DD
  tipo_comprobante: string;
  numero_comprobante: string;
  clave_acceso: string;
  ruc_cliente: string;
  razon_social_cliente: string;
  identificacion_receptor: string;
  subtotal_0: number;
  subtotal_8: number;
  subtotal_15: number;
  iva: number;
  total: number;
}

/**
 * Resultado del parseo con warnings para el usuario
 */
export interface NotasCreditoParseResult {
  data: NotaCreditoParsed[];
  warnings: string[];
  skippedCount: number;
}

/**
 * Convierte una fecha del formato DD/MM/YYYY a YYYY-MM-DD
 */
function convertirFecha(fechaOriginal: string): string {
  try {
    const fechaLimpia = fechaOriginal.trim();

    const fecha = dayjs(fechaLimpia, "DD/MM/YYYY");
    if (fecha.isValid()) {
      return fecha.format("YYYY-MM-DD");
    }

    const fechaISO = dayjs(fechaLimpia, "YYYY-MM-DD");
    if (fechaISO.isValid()) {
      return fechaISO.format("YYYY-MM-DD");
    }

    throw new Error("Fecha inválida");
  } catch {
    console.warn("Error convirtiendo fecha:", fechaOriginal);
    return "";
  }
}

/**
 * Calcula los subtotales basándose en el valor sin impuestos y el IVA
 */
function calcularSubtotales(
  valorSinImpuestos: number,
  iva: number
): { subtotal_0: number; subtotal_8: number; subtotal_15: number } {
  if (iva === 0) {
    return { subtotal_0: valorSinImpuestos, subtotal_8: 0, subtotal_15: 0 };
  }

  const tarifaIva = iva / valorSinImpuestos;

  if (tarifaIva <= 0.001) {
    return { subtotal_0: valorSinImpuestos, subtotal_8: 0, subtotal_15: 0 };
  } else if (tarifaIva >= 0.07 && tarifaIva <= 0.09) {
    return { subtotal_0: 0, subtotal_8: valorSinImpuestos, subtotal_15: 0 };
  } else if (tarifaIva >= 0.11 && tarifaIva <= 0.13) {
    return { subtotal_0: 0, subtotal_8: 0, subtotal_15: valorSinImpuestos };
  } else if (tarifaIva >= 0.14 && tarifaIva <= 0.16) {
    return { subtotal_0: 0, subtotal_8: 0, subtotal_15: valorSinImpuestos };
  }

  return { subtotal_0: 0, subtotal_8: 0, subtotal_15: valorSinImpuestos };
}

/**
 * Parsea un archivo TXT de notas de crédito del SRI.
 * Formato esperado: tab-delimited, similar al archivo de ventas.
 *
 * @param contenido Contenido del archivo como string
 * @param periodoMes Mes del periodo (para fallback de fechas)
 * @param periodoAnio Año del periodo (para fallback de fechas)
 * @returns Resultado con data, warnings y skippedCount
 */
export function parsearArchivoNotasCredito(
  contenido: string,
  periodoMes?: number,
  periodoAnio?: number,
): NotasCreditoParseResult {
  const fallbackDate = periodoMes && periodoAnio
    ? dayjs(`${periodoAnio}-${String(periodoMes).padStart(2, "0")}-01`).format("YYYY-MM-DD")
    : dayjs().startOf("month").format("YYYY-MM-DD");
  const warnings: string[] = [];
  let skippedCount = 0;
  const lineas = contenido.split("\n").filter((linea) => linea.trim() !== "");

  if (lineas.length < 2) {
    throw new Error("El archivo está vacío o no tiene datos");
  }

  // Primera línea son los headers
  const headers = lineas[0].split("\t").map((h) => h.trim().toUpperCase());

  // Detectar si el archivo tiene columnas de compras (VALOR_SIN_IMPUESTOS + IVA)
  // o de ventas (solo VALOR_TOTAL)
  const hasValorSinImpuestos = headers.some((h) =>
    h.includes("VALOR") && h.includes("SIN") && h.includes("IMPUESTO")
  );

  // Mapeo de índices de columnas (formato ventas)
  const indices = {
    fecha_emision: headers.findIndex((h) =>
      h.includes("FECHA") && h.includes("EMISION")
    ),
    comprobante: headers.findIndex((h) =>
      h === "COMPROBANTE" || h.includes("TIPO")
    ),
    numero_comprobante: headers.findIndex((h) =>
      h.includes("NUMERO") && h.includes("COMPROBANTE") ||
      h.includes("SERIE") && h.includes("COMPROBANTE")
    ),
    identificacion_receptor: headers.findIndex((h) =>
      h.includes("IDENTIFICACION") || h.includes("RUC") || h.includes("CEDULA")
    ),
    razon_social: headers.findIndex((h) =>
      h.includes("RAZON") || h.includes("NOMBRE") || h.includes("CLIENTE")
    ),
    clave_acceso: headers.findIndex((h) =>
      h.includes("CLAVE") && h.includes("ACCESO")
    ),
    valor_total: headers.findIndex((h) =>
      h.includes("TOTAL") || (h.includes("VALOR") && !h.includes("SIN"))
    ),
    // Compras-like columns (optional)
    valor_sin_impuestos: headers.findIndex((h) =>
      h.includes("VALOR") && h.includes("SIN") && h.includes("IMPUESTO")
    ),
    iva: headers.findIndex((h) => h === "IVA"),
  };

  // Fallback por posición conocida (formato ventas)
  if (indices.fecha_emision === -1) indices.fecha_emision = 0;
  if (indices.comprobante === -1) indices.comprobante = 1;
  if (indices.numero_comprobante === -1) indices.numero_comprobante = 2;
  if (indices.identificacion_receptor === -1) indices.identificacion_receptor = 3;
  if (indices.razon_social === -1) indices.razon_social = 4;
  if (indices.clave_acceso === -1) indices.clave_acceso = 5;
  if (indices.valor_total === -1) indices.valor_total = 6;

  const notasCredito: NotaCreditoParsed[] = [];

  for (let i = 1; i < lineas.length; i++) {
    const columnas = lineas[i].split("\t");

    if (columnas.length < 5) continue;

    try {
      let valorSinImpuestos: number;
      let iva: number;
      let total: number;

      if (hasValorSinImpuestos && indices.valor_sin_impuestos !== -1 && indices.iva !== -1) {
        // Formato compras-like: tiene VALOR_SIN_IMPUESTOS + IVA + TOTAL
        valorSinImpuestos = parseFloat(columnas[indices.valor_sin_impuestos]?.trim() || "0");
        iva = parseFloat(columnas[indices.iva]?.trim() || "0");
        const totalStr = columnas[indices.valor_total]?.trim() || "0";
        total = parseFloat(totalStr.replace(/[^\d.,]/g, "").replace(",", "."));
      } else {
        // Formato ventas-like: solo VALOR_TOTAL — derivar subtotal e IVA asumiendo 15%
        const totalStr = columnas[indices.valor_total]?.trim() || "0";
        total = parseFloat(totalStr.replace(/[^\d.,]/g, "").replace(",", "."));
        // Asumir tarifa vigente (15%)
        const divisor = 1.15;
        valorSinImpuestos = parseFloat((total / divisor).toFixed(2));
        iva = parseFloat((total - valorSinImpuestos).toFixed(2));
      }

      if (isNaN(total) || total <= 0) {
        warnings.push(`Fila ${i + 1}: valor total inválido, registro omitido`);
        skippedCount++;
        continue;
      }

      const numeroComprobante = columnas[indices.numero_comprobante]?.trim() || "";
      if (!numeroComprobante) {
        warnings.push(`Fila ${i + 1}: número de comprobante vacío, registro omitido`);
        skippedCount++;
        continue;
      }

      // Convertir fecha con fallback al periodo
      const fechaEmisionOriginal = columnas[indices.fecha_emision]?.trim() || "";
      let fechaEmision = convertirFecha(fechaEmisionOriginal);
      if (!fechaEmision) {
        fechaEmision = fallbackDate;
        warnings.push(`Fila ${i + 1}: fecha inválida '${fechaEmisionOriginal}', se usó fecha del periodo`);
      }

      const { subtotal_0, subtotal_8, subtotal_15 } = calcularSubtotales(valorSinImpuestos, iva);

      const notaCredito: NotaCreditoParsed = {
        fecha_emision: fechaEmision,
        tipo_comprobante: "nota_credito",
        numero_comprobante: numeroComprobante,
        clave_acceso: columnas[indices.clave_acceso]?.trim() || "",
        ruc_cliente: columnas[indices.identificacion_receptor]?.trim() || "",
        razon_social_cliente: columnas[indices.razon_social]?.trim() || "",
        identificacion_receptor: columnas[indices.identificacion_receptor]?.trim() || "",
        subtotal_0,
        subtotal_8,
        subtotal_15,
        iva,
        total,
      };

      notasCredito.push(notaCredito);
    } catch (error: unknown) {
      warnings.push(`Fila ${i + 1}: error inesperado, registro omitido`);
      skippedCount++;
      console.warn(`Error procesando línea ${i + 1}:`, error);
    }
  }

  return { data: notasCredito, warnings, skippedCount };
}

/**
 * Valida que el RUC del archivo de notas de crédito coincida con el del contribuyente.
 * Retorna un mensaje de error si no coincide, o null si está OK.
 */
export function validarRucNotasCredito(
  data: NotaCreditoParsed[],
  contribuyenteRuc: string
): string | null {
  if (data.length === 0) return null;

  const primerRegistro = data.find((nc) => nc.identificacion_receptor?.trim());
  if (!primerRegistro || !primerRegistro.identificacion_receptor) return null;

  const rucArchivo = primerRegistro.identificacion_receptor.trim();
  const rucUsuario = contribuyenteRuc.trim();

  // Normalizar a 13 dígitos (RUC ecuatoriano) — archivos a veces omiten el 0 inicial
  const normalizar = (ruc: string) => ruc.padStart(13, "0");

  if (normalizar(rucArchivo) !== normalizar(rucUsuario)) {
    return `El archivo pertenece al RUC ${rucArchivo}, pero tu RUC es ${rucUsuario}. Verifica que estés subiendo el archivo correcto.`;
  }

  return null;
}
