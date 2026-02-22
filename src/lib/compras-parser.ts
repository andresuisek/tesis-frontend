import { RubroCompra } from "./supabase";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

/**
 * Interfaz para una compra parseada del archivo TXT del SRI
 */
export interface CompraParsed {
  ruc_proveedor: string;
  razon_social_proveedor: string;
  tipo_comprobante: string;
  numero_comprobante: string; // SERIE_COMPROBANTE
  clave_acceso: string;
  fecha_emision: string; // En formato YYYY-MM-DD
  identificacion_receptor: string;
  valor_sin_impuesto: number;
  iva: number;
  total: number;
  // Campos calculados
  subtotal_0: number;
  subtotal_5: number;
  subtotal_8: number;
  subtotal_15: number;
  // Campo a asignar por el usuario
  rubro?: RubroCompra;
}

/**
 * Interfaz para el resumen agrupado por proveedor
 */
export interface ProveedorResumen {
  ruc_proveedor: string;
  razon_social_proveedor: string;
  cantidad_compras: number;
  valor_sin_impuesto: number;
  iva_total: number;
  total_compras: number;
  rubro?: RubroCompra;
}

/**
 * Resultado del parseo con warnings para el usuario
 */
export interface ComprasParseResult {
  data: CompraParsed[];
  warnings: string[];
  skippedCount: number;
}

/**
 * Parsea un archivo TXT de compras del SRI
 * @param contenido Contenido del archivo como string
 * @param periodoMes Mes del periodo (para fallback de fechas)
 * @param periodoAnio Año del periodo (para fallback de fechas)
 * @returns Resultado con data, warnings y skippedCount
 */
export function parsearArchivoCompras(
  contenido: string,
  periodoMes?: number,
  periodoAnio?: number,
): ComprasParseResult {
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
  const headers = lineas[0].split("\t");

  // Mapeo de índices de columnas
  const indices = {
    ruc_emisor: headers.indexOf("RUC_EMISOR"),
    razon_social_emisor: headers.indexOf("RAZON_SOCIAL_EMISOR"),
    tipo_comprobante: headers.indexOf("TIPO_COMPROBANTE"),
    serie_comprobante: headers.indexOf("SERIE_COMPROBANTE"),
    clave_acceso: headers.indexOf("CLAVE_ACCESO"),
    fecha_emision: headers.indexOf("FECHA_EMISION"),
    identificacion_receptor: headers.indexOf("IDENTIFICACION_RECEPTOR"),
    valor_sin_impuestos: headers.indexOf("VALOR_SIN_IMPUESTOS"),
    iva: headers.indexOf("IVA"),
    importe_total: headers.indexOf("IMPORTE_TOTAL"),
  };

  // Validar que existan todas las columnas necesarias
  const columnasRequeridas = [
    "ruc_emisor",
    "razon_social_emisor",
    "clave_acceso",
    "fecha_emision",
    "valor_sin_impuestos",
    "iva",
    "importe_total",
  ];

  for (const columna of columnasRequeridas) {
    if (indices[columna as keyof typeof indices] === -1) {
      throw new Error(`Columna requerida no encontrada: ${columna}`);
    }
  }

  const compras: CompraParsed[] = [];

  // Procesar cada línea de datos
  for (let i = 1; i < lineas.length; i++) {
    const columnas = lineas[i].split("\t");

    // Saltar líneas vacías
    if (columnas.length < 5) continue;

    try {
      // Validar RUC proveedor
      const rucProveedor = (columnas[indices.ruc_emisor] || "").trim();
      if (!rucProveedor || rucProveedor.length < 10) {
        warnings.push(`Fila ${i + 1}: RUC proveedor inválido '${rucProveedor}', registro omitido`);
        skippedCount++;
        continue;
      }

      // Validar número de comprobante
      const numeroComprobante = (columnas[indices.serie_comprobante] || "").trim();
      if (!numeroComprobante) {
        warnings.push(`Fila ${i + 1}: número de comprobante vacío, registro omitido`);
        skippedCount++;
        continue;
      }

      const valorSinImpuestos = parseFloat(
        columnas[indices.valor_sin_impuestos] || "0"
      );
      const iva = parseFloat(columnas[indices.iva] || "0");
      const total = parseFloat(columnas[indices.importe_total] || "0");

      if (isNaN(total) || total <= 0) {
        warnings.push(`Fila ${i + 1}: importe total inválido, registro omitido`);
        skippedCount++;
        continue;
      }

      // Calcular subtotales basados en el IVA
      const { subtotal_0, subtotal_5, subtotal_8, subtotal_15 } =
        calcularSubtotales(valorSinImpuestos, iva);

      // Convertir fecha con fallback al periodo
      const fechaEmisionOriginal = columnas[indices.fecha_emision] || "";
      let fechaEmision = convertirFecha(fechaEmisionOriginal);
      if (!fechaEmision) {
        fechaEmision = fallbackDate;
        warnings.push(`Fila ${i + 1}: fecha inválida '${fechaEmisionOriginal}', se usó fecha del periodo`);
      }

      // Mapear tipo de comprobante
      const tipoComprobanteOriginal = columnas[indices.tipo_comprobante] || "";
      const tipoComprobante = mapearTipoComprobante(tipoComprobanteOriginal);

      const compra: CompraParsed = {
        ruc_proveedor: rucProveedor,
        razon_social_proveedor: (columnas[indices.razon_social_emisor] || "").trim(),
        tipo_comprobante: tipoComprobante,
        numero_comprobante: numeroComprobante,
        clave_acceso: (columnas[indices.clave_acceso] || "").trim(),
        fecha_emision: fechaEmision,
        identificacion_receptor: (columnas[indices.identificacion_receptor] || "").trim(),
        valor_sin_impuesto: valorSinImpuestos,
        iva: iva,
        total: total,
        subtotal_0: subtotal_0,
        subtotal_5: subtotal_5,
        subtotal_8: subtotal_8,
        subtotal_15: subtotal_15,
      };

      compras.push(compra);
    } catch (error: unknown) {
      warnings.push(`Fila ${i + 1}: error inesperado, registro omitido`);
      skippedCount++;
      console.warn(`Error procesando línea ${i + 1}:`, error);
    }
  }

  return { data: compras, warnings, skippedCount };
}

/**
 * Calcula los subtotales basándose en el valor sin impuestos y el IVA
 */
function calcularSubtotales(
  valorSinImpuestos: number,
  iva: number
): { subtotal_0: number; subtotal_5: number; subtotal_8: number; subtotal_15: number } {
  const base = { subtotal_0: 0, subtotal_5: 0, subtotal_8: 0, subtotal_15: 0 };

  // Si no hay IVA, todo va a subtotal_0
  if (iva === 0) {
    return { ...base, subtotal_0: valorSinImpuestos };
  }

  // Calcular la tarifa de IVA
  const tarifaIva = iva / valorSinImpuestos;

  // Determinar qué subtotal usar basado en la tarifa
  if (tarifaIva <= 0.001) {
    // ~0%
    return { ...base, subtotal_0: valorSinImpuestos };
  } else if (tarifaIva >= 0.04 && tarifaIva <= 0.06) {
    // ~5%
    return { ...base, subtotal_5: valorSinImpuestos };
  } else if (tarifaIva >= 0.07 && tarifaIva <= 0.09) {
    // ~8%
    return { ...base, subtotal_8: valorSinImpuestos };
  } else if (tarifaIva >= 0.11 && tarifaIva <= 0.13) {
    // ~12% (periodos anteriores a abril 2024)
    return { ...base, subtotal_15: valorSinImpuestos }; // Se acumula en subtotal_15 para efectos de crédito tributario
  } else if (tarifaIva >= 0.14 && tarifaIva <= 0.16) {
    // ~15%
    return { ...base, subtotal_15: valorSinImpuestos };
  }

  // Por defecto, asumir tarifa vigente si no coincide con ninguna tarifa conocida
  return { ...base, subtotal_15: valorSinImpuestos };
}

/**
 * Convierte una fecha del formato DD/MM/YYYY HH:mm:ss a YYYY-MM-DD
 */
function convertirFecha(fechaOriginal: string): string {
  try {
    // El formato del archivo es "DD/MM/YYYY HH:mm:ss"
    const fecha = dayjs(fechaOriginal, "DD/MM/YYYY HH:mm:ss");
    if (!fecha.isValid()) {
      // Intentar solo con la fecha
      const fechaSolo = dayjs(fechaOriginal.split(" ")[0], "DD/MM/YYYY");
      if (!fechaSolo.isValid()) {
        throw new Error("Fecha inválida");
      }
      return fechaSolo.format("YYYY-MM-DD");
    }
    return fecha.format("YYYY-MM-DD");
  } catch {
    console.warn("Error convirtiendo fecha:", fechaOriginal);
    return ""; // Retorna vacío para que el caller maneje el fallback con fecha del periodo
  }
}

/**
 * Mapea el tipo de comprobante del SRI a nuestro enum
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

  return "otros";
}

/**
 * Agrupa las compras por proveedor
 */
export function agruparPorProveedor(
  compras: CompraParsed[]
): ProveedorResumen[] {
  const proveedoresMap = new Map<string, ProveedorResumen>();

  for (const compra of compras) {
    const key = compra.ruc_proveedor;

    if (!proveedoresMap.has(key)) {
      proveedoresMap.set(key, {
        ruc_proveedor: compra.ruc_proveedor,
        razon_social_proveedor: compra.razon_social_proveedor,
        cantidad_compras: 0,
        valor_sin_impuesto: 0,
        iva_total: 0,
        total_compras: 0,
      });
    }

    const proveedor = proveedoresMap.get(key)!;
    proveedor.cantidad_compras++;
    proveedor.valor_sin_impuesto += compra.valor_sin_impuesto;
    proveedor.iva_total += compra.iva;
    proveedor.total_compras += compra.total;
  }

  return Array.from(proveedoresMap.values());
}

/**
 * Valida que el RUC del archivo de compras (identificacion_receptor) coincida con el contribuyente.
 * Retorna un mensaje de error si no coincide, o null si está OK.
 */
export function validarRucCompras(
  compras: CompraParsed[],
  contribuyenteRuc: string
): string | null {
  if (compras.length === 0) return null;

  // Verificar que el identificacion_receptor coincida con el RUC del contribuyente
  const primerRegistro = compras.find((c) => c.identificacion_receptor?.trim());
  if (!primerRegistro || !primerRegistro.identificacion_receptor) return null;

  const rucArchivo = primerRegistro.identificacion_receptor.trim();
  const rucUsuario = contribuyenteRuc.trim();

  // Extraer cédula (primeros 10 dígitos) para comparación flexible
  // En Ecuador, RUC = cédula (10 dígitos) + sufijo (001)
  const extraerCedula = (ruc: string) =>
    ruc.replace(/^0+/, "").slice(0, 10).padStart(10, "0");

  if (extraerCedula(rucArchivo) !== extraerCedula(rucUsuario)) {
    return `El archivo pertenece al RUC ${rucArchivo}, pero tu RUC es ${rucUsuario}. Verifica que estés subiendo el archivo correcto.`;
  }

  return null;
}

/**
 * Asigna rubros a las compras basándose en el mapeo de proveedores
 */
export function asignarRubrosACompras(
  compras: CompraParsed[],
  proveedoresConRubro: ProveedorResumen[]
): CompraParsed[] {
  const rubrosPorRuc = new Map<string, RubroCompra>();

  for (const proveedor of proveedoresConRubro) {
    if (proveedor.rubro) {
      rubrosPorRuc.set(proveedor.ruc_proveedor, proveedor.rubro);
    }
  }

  return compras.map((compra) => ({
    ...compra,
    rubro: rubrosPorRuc.get(compra.ruc_proveedor),
  }));
}

