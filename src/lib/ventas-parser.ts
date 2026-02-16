import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

/**
 * Interfaz para una venta parseada del archivo TXT del SRI
 */
export interface VentaParsed {
  fecha_emision: string; // En formato YYYY-MM-DD
  tipo_comprobante: string;
  numero_comprobante: string;
  ruc_cliente: string;
  razon_social_cliente: string;
  clave_acceso: string;
  total: number;
  // Campos calculados basados en el IVA seleccionado
  subtotal: number;
  iva: number;
}

/**
 * Tipo para las tasas de IVA disponibles en Ecuador
 */
export type TasaIVA = 0 | 8 | 12 | 15;

/**
 * Calcula el subtotal e IVA a partir del valor total y la tasa de IVA
 * @param total Valor total (incluye IVA)
 * @param tasaIVA Porcentaje de IVA (0, 8, 12 o 15)
 * @returns Objeto con subtotal e IVA calculados
 */
export function calcularSubtotalEIVA(
  total: number,
  tasaIVA: TasaIVA
): { subtotal: number; iva: number } {
  if (tasaIVA === 0) {
    return {
      subtotal: total,
      iva: 0,
    };
  }

  // Fórmula: total = subtotal + (subtotal * tasaIVA / 100)
  // total = subtotal * (1 + tasaIVA / 100)
  // subtotal = total / (1 + tasaIVA / 100)
  const divisor = 1 + tasaIVA / 100;
  const subtotal = parseFloat((total / divisor).toFixed(2));
  const iva = parseFloat((total - subtotal).toFixed(2));

  return {
    subtotal,
    iva,
  };
}

/**
 * Convierte una fecha del formato DD/MM/YYYY a YYYY-MM-DD
 */
function convertirFecha(fechaOriginal: string): string {
  try {
    // Limpiar la fecha de posibles espacios
    const fechaLimpia = fechaOriginal.trim();
    
    // Intentar con formato DD/MM/YYYY
    const fecha = dayjs(fechaLimpia, "DD/MM/YYYY");
    if (fecha.isValid()) {
      return fecha.format("YYYY-MM-DD");
    }

    // Intentar con formato YYYY-MM-DD
    const fechaISO = dayjs(fechaLimpia, "YYYY-MM-DD");
    if (fechaISO.isValid()) {
      return fechaISO.format("YYYY-MM-DD");
    }

    throw new Error("Fecha inválida");
  } catch {
    console.warn("Error convirtiendo fecha:", fechaOriginal);
    return ""; // Retorna vacío para que el caller maneje el fallback con fecha del periodo
  }
}

/**
 * Mapea el tipo de comprobante del archivo a nuestro enum
 */
function mapearTipoComprobante(tipoOriginal: string): string {
  const tipo = tipoOriginal.toLowerCase().trim();

  if (tipo.includes("factura")) {
    return "factura";
  } else if (tipo.includes("liquidacion")) {
    return "liquidacion_compra";
  } else if (tipo.includes("nota") && tipo.includes("credito")) {
    return "nota_credito";
  } else if (tipo.includes("retencion")) {
    return "retencion";
  }

  return "factura"; // Por defecto factura para ventas
}

/**
 * Resultado del parseo con warnings para el usuario
 */
export interface VentasParseResult {
  data: VentaParsed[];
  warnings: string[];
  skippedCount: number;
}

/**
 * Parsea un archivo TXT de ventas del SRI
 * Formato esperado del archivo:
 * FECHA_EMISION	COMPROBANTE	NUMERO_COMPROBANTE	IDENTIFICACION_RECEPTOR	RAZON_SOCIAL	CLAVE_ACCESO	VALOR_TOTAL
 *
 * @param contenido Contenido del archivo como string
 * @param tasaIVA Tasa de IVA para calcular subtotales
 * @param periodoMes Mes del periodo (para fallback de fechas)
 * @param periodoAnio Año del periodo (para fallback de fechas)
 * @returns Resultado con data, warnings y skippedCount
 */
export function parsearArchivoVentas(
  contenido: string,
  tasaIVA: TasaIVA,
  periodoMes?: number,
  periodoAnio?: number,
): VentasParseResult {
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

  // Mapeo de índices de columnas
  const indices = {
    fecha_emision: headers.findIndex((h) => 
      h.includes("FECHA") && h.includes("EMISION")
    ),
    comprobante: headers.findIndex((h) => 
      h === "COMPROBANTE" || h.includes("TIPO")
    ),
    numero_comprobante: headers.findIndex((h) => 
      h.includes("NUMERO") && h.includes("COMPROBANTE")
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
      h.includes("TOTAL") || h.includes("VALOR")
    ),
  };

  // Si no encontramos por nombre específico, intentar por posición conocida
  // Formato: FECHA_EMISION | COMPROBANTE | NUMERO_COMPROBANTE | IDENTIFICACION_RECEPTOR | RAZON_SOCIAL | CLAVE_ACCESO | VALOR_TOTAL
  if (indices.fecha_emision === -1) indices.fecha_emision = 0;
  if (indices.comprobante === -1) indices.comprobante = 1;
  if (indices.numero_comprobante === -1) indices.numero_comprobante = 2;
  if (indices.identificacion_receptor === -1) indices.identificacion_receptor = 3;
  if (indices.razon_social === -1) indices.razon_social = 4;
  if (indices.clave_acceso === -1) indices.clave_acceso = 5;
  if (indices.valor_total === -1) indices.valor_total = 6;

  const ventas: VentaParsed[] = [];

  // Procesar cada línea de datos
  for (let i = 1; i < lineas.length; i++) {
    const columnas = lineas[i].split("\t");

    // Saltar líneas vacías o con pocas columnas
    if (columnas.length < 5) continue;

    try {
      const totalStr = columnas[indices.valor_total]?.trim() || "0";
      // Limpiar el valor total de posibles caracteres no numéricos
      const total = parseFloat(totalStr.replace(/[^\d.,]/g, "").replace(",", "."));

      if (isNaN(total) || total <= 0) {
        warnings.push(`Fila ${i + 1}: valor total inválido '${totalStr}', registro omitido`);
        skippedCount++;
        continue;
      }

      // Validar numero de comprobante
      const numeroComprobante = columnas[indices.numero_comprobante]?.trim() || "";
      if (!numeroComprobante) {
        warnings.push(`Fila ${i + 1}: número de comprobante vacío, registro omitido`);
        skippedCount++;
        continue;
      }

      // Calcular subtotal e IVA basado en la tasa seleccionada
      const { subtotal, iva } = calcularSubtotalEIVA(total, tasaIVA);

      // Convertir fecha con fallback al periodo
      const fechaEmisionOriginal = columnas[indices.fecha_emision]?.trim() || "";
      let fechaEmision = convertirFecha(fechaEmisionOriginal);
      if (!fechaEmision) {
        fechaEmision = fallbackDate;
        warnings.push(`Fila ${i + 1}: fecha inválida '${fechaEmisionOriginal}', se usó fecha del periodo`);
      }

      // Mapear tipo de comprobante
      const tipoComprobanteOriginal = columnas[indices.comprobante]?.trim() || "Factura";
      const tipoComprobante = mapearTipoComprobante(tipoComprobanteOriginal);

      const venta: VentaParsed = {
        fecha_emision: fechaEmision,
        tipo_comprobante: tipoComprobante,
        numero_comprobante: numeroComprobante,
        ruc_cliente: columnas[indices.identificacion_receptor]?.trim() || "",
        razon_social_cliente: columnas[indices.razon_social]?.trim() || "",
        clave_acceso: columnas[indices.clave_acceso]?.trim() || "",
        total: total,
        subtotal: subtotal,
        iva: iva,
      };

      ventas.push(venta);
    } catch (error: unknown) {
      warnings.push(`Fila ${i + 1}: error inesperado, registro omitido`);
      skippedCount++;
      console.warn(`Error procesando línea ${i + 1}:`, error);
    }
  }

  return { data: ventas, warnings, skippedCount };
}

/**
 * Resumen de las ventas importadas
 */
export interface VentasResumen {
  cantidad: number;
  total: number;
  subtotal: number;
  iva: number;
  tasaIVA: TasaIVA;
}

/**
 * Calcula el resumen de las ventas parseadas
 */
export function calcularResumenVentas(
  ventas: VentaParsed[],
  tasaIVA: TasaIVA
): VentasResumen {
  const totales = ventas.reduce(
    (acc, venta) => ({
      total: acc.total + venta.total,
      subtotal: acc.subtotal + venta.subtotal,
      iva: acc.iva + venta.iva,
    }),
    { total: 0, subtotal: 0, iva: 0 }
  );

  return {
    cantidad: ventas.length,
    total: parseFloat(totales.total.toFixed(2)),
    subtotal: parseFloat(totales.subtotal.toFixed(2)),
    iva: parseFloat(totales.iva.toFixed(2)),
    tasaIVA,
  };
}





