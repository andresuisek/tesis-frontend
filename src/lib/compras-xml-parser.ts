import { XMLParser } from "fast-xml-parser";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { CompraParsed } from "./compras-parser";

dayjs.extend(customParseFormat);

/**
 * Mapeo de codigoPorcentaje del SRI al campo de subtotal correspondiente
 */
const CODIGO_PORCENTAJE_MAP: Record<
  string,
  { field: "subtotal_0" | "subtotal_5" | "subtotal_iva" }
> = {
  "0": { field: "subtotal_0" },
  "6": { field: "subtotal_0" }, // No IVA → treat as 0%
  "5": { field: "subtotal_5" },
  "7": { field: "subtotal_iva" }, // 8%
  "8": { field: "subtotal_iva" }, // 8%
  "2": { field: "subtotal_iva" }, // 12-15%
  "3": { field: "subtotal_iva" }, // 14%
  "4": { field: "subtotal_iva" }, // 15%
};

/**
 * Mapeo de codDoc del SRI a tipo de comprobante
 */
const COD_DOC_MAP: Record<string, string> = {
  "01": "factura",
  "03": "liquidacion_compra",
  "04": "nota_credito",
  "05": "nota_debito",
};

/**
 * Resultado del parseo de XMLs de compras
 */
export interface ComprasXMLParseResult {
  compras: CompraParsed[];
  errores: string[];
  skipped: number;
}

/**
 * Convierte una fecha del formato DD/MM/YYYY a YYYY-MM-DD
 */
function convertirFecha(fechaOriginal: string): string {
  try {
    const fecha = dayjs(fechaOriginal, "DD/MM/YYYY");
    if (!fecha.isValid()) {
      throw new Error("Fecha inválida");
    }
    return fecha.format("YYYY-MM-DD");
  } catch {
    console.warn("Error convirtiendo fecha:", fechaOriginal);
    return "";
  }
}

/**
 * Normaliza un valor que puede ser un solo objeto o un array a siempre un array
 */
function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Parsea un solo archivo XML de compra del SRI
 */
export function parsearXMLCompra(
  xmlContent: string,
  fileName?: string
): { success: true; compra: CompraParsed } | { success: false; error: string; skipped?: boolean } {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseTagValue: true,
      trimValues: true,
    });

    // Primera pasada: parsear el XML de autorización
    const autorizacion = parser.parse(xmlContent);

    if (!autorizacion.autorizacion) {
      return {
        success: false,
        error: `${fileName || "Archivo"}: No contiene estructura de autorización válida`,
      };
    }

    const estado = String(autorizacion.autorizacion.estado || "").toUpperCase();
    if (estado !== "AUTORIZADO") {
      return {
        success: false,
        error: `${fileName || "Archivo"}: Estado "${estado}" (no autorizado)`,
        skipped: true,
      };
    }

    const claveAcceso = String(autorizacion.autorizacion.numeroAutorizacion || "");

    // El comprobante está dentro de CDATA, necesitamos parsearlo de nuevo
    const comprobanteXML = autorizacion.autorizacion.comprobante;
    if (!comprobanteXML) {
      return {
        success: false,
        error: `${fileName || "Archivo"}: No se encontró el comprobante dentro de la autorización`,
      };
    }

    // Segunda pasada: parsear el comprobante (factura)
    const comprobante = parser.parse(comprobanteXML);

    if (!comprobante.factura) {
      // Podría ser nota de crédito u otro tipo
      const tipoDoc = Object.keys(comprobante).find(
        (k) => k !== "?xml" && k !== "#text"
      );
      if (!tipoDoc) {
        return {
          success: false,
          error: `${fileName || "Archivo"}: Tipo de comprobante no reconocido`,
        };
      }
    }

    // Soportar factura y otros tipos de comprobantes
    const facturaData =
      comprobante.factura ||
      comprobante.notaCredito ||
      comprobante.notaDebito ||
      comprobante.liquidacionCompra;

    if (!facturaData) {
      return {
        success: false,
        error: `${fileName || "Archivo"}: Estructura del comprobante no reconocida`,
      };
    }

    const infoTributaria = facturaData.infoTributaria;
    const infoFactura =
      facturaData.infoFactura ||
      facturaData.infoNotaCredito ||
      facturaData.infoNotaDebito ||
      facturaData.infoLiquidacionCompra;

    if (!infoTributaria || !infoFactura) {
      return {
        success: false,
        error: `${fileName || "Archivo"}: Estructura XML incompleta`,
      };
    }

    // Construir número de comprobante
    const estab = String(infoTributaria.estab || "").padStart(3, "0");
    const ptoEmi = String(infoTributaria.ptoEmi || "").padStart(3, "0");
    const secuencial = String(infoTributaria.secuencial || "").padStart(9, "0");
    const numeroComprobante = `${estab}-${ptoEmi}-${secuencial}`;

    // Mapear tipo de comprobante
    const codDoc = String(infoTributaria.codDoc || "01");
    const tipoComprobante = COD_DOC_MAP[codDoc] || "otros";

    // Fecha de emisión
    const fechaEmision = convertirFecha(String(infoFactura.fechaEmision || ""));

    // Calcular subtotales desde totalConImpuestos
    let subtotal_0 = 0;
    let subtotal_5 = 0;
    let subtotal_iva = 0; // Para 8%, 12%, 15%
    let ivaTotal = 0;

    const totalImpuestos = asArray(
      infoFactura.totalConImpuestos?.totalImpuesto
    );

    for (const impuesto of totalImpuestos) {
      const codigoPorcentaje = String(impuesto.codigoPorcentaje || "");
      const baseImponible = parseFloat(impuesto.baseImponible) || 0;
      const valor = parseFloat(impuesto.valor) || 0;

      const mapping = CODIGO_PORCENTAJE_MAP[codigoPorcentaje];
      if (mapping) {
        if (mapping.field === "subtotal_0") subtotal_0 += baseImponible;
        else if (mapping.field === "subtotal_5") subtotal_5 += baseImponible;
        else if (mapping.field === "subtotal_iva") subtotal_iva += baseImponible;
      } else {
        // Código desconocido, asumimos IVA general
        subtotal_iva += baseImponible;
      }

      ivaTotal += valor;
    }

    const valorSinImpuesto = parseFloat(infoFactura.totalSinImpuestos) || 0;
    const total = parseFloat(infoFactura.importeTotal) || 0;

    // Determinar subtotal_8 y subtotal_15 a partir de subtotal_iva
    // Usamos la tarifa del totalImpuesto para decidir
    let subtotal_8 = 0;
    let subtotal_15 = 0;

    for (const impuesto of totalImpuestos) {
      const codigoPorcentaje = String(impuesto.codigoPorcentaje || "");
      const baseImponible = parseFloat(impuesto.baseImponible) || 0;
      const mapping = CODIGO_PORCENTAJE_MAP[codigoPorcentaje];

      if (mapping?.field === "subtotal_iva") {
        const tarifa = parseFloat(impuesto.tarifa) || 0;
        if (tarifa > 0 && tarifa <= 8) {
          subtotal_8 += baseImponible;
        } else {
          subtotal_15 += baseImponible;
        }
      }
    }

    const compra: CompraParsed = {
      ruc_proveedor: String(infoTributaria.ruc || ""),
      razon_social_proveedor: String(infoTributaria.razonSocial || ""),
      tipo_comprobante: tipoComprobante,
      numero_comprobante: numeroComprobante,
      clave_acceso: claveAcceso,
      fecha_emision: fechaEmision,
      identificacion_receptor: String(
        infoFactura.identificacionComprador || ""
      ),
      valor_sin_impuesto: valorSinImpuesto,
      iva: Math.round(ivaTotal * 100) / 100,
      total,
      subtotal_0: Math.round(subtotal_0 * 100) / 100,
      subtotal_5: Math.round(subtotal_5 * 100) / 100,
      subtotal_8: Math.round(subtotal_8 * 100) / 100,
      subtotal_15: Math.round(subtotal_15 * 100) / 100,
    };

    return { success: true, compra };
  } catch (error) {
    console.error("Error parseando XML:", error);
    return {
      success: false,
      error: `${fileName || "Archivo"}: ${error instanceof Error ? error.message : "Error desconocido"}`,
    };
  }
}

/**
 * Parsea múltiples archivos XML de compras
 * @param files Lista de archivos File a parsear
 * @param onProgress Callback de progreso (0-100)
 */
export async function parsearMultiplesXMLCompras(
  files: File[],
  onProgress?: (percent: number) => void
): Promise<ComprasXMLParseResult> {
  const compras: CompraParsed[] = [];
  const errores: string[] = [];
  let skipped = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    try {
      const content = await file.text();
      const result = parsearXMLCompra(content, file.name);

      if (result.success) {
        compras.push(result.compra);
      } else {
        if (result.skipped) {
          skipped++;
        }
        errores.push(result.error);
      }
    } catch (error) {
      errores.push(
        `${file.name}: Error leyendo archivo - ${error instanceof Error ? error.message : "Error desconocido"}`
      );
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / files.length) * 100));
    }
  }

  return { compras, errores, skipped };
}
