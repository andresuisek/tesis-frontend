import { XMLParser } from "fast-xml-parser";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

/**
 * Mapeo de codigoPorcentaje del SRI al campo de subtotal correspondiente
 */
const CODIGO_PORCENTAJE_MAP: Record<
  string,
  { field: "subtotal_0" | "subtotal_5" | "subtotal_iva" }
> = {
  "0": { field: "subtotal_0" },
  "6": { field: "subtotal_0" }, // No IVA -> treat as 0%
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
 * Interfaz para una venta parseada desde XML
 */
export interface VentaXmlParsed {
  fecha_emision: string; // YYYY-MM-DD
  tipo_comprobante: string;
  numero_comprobante: string; // "001-100-000000019"
  ruc_cliente: string; // identificacionComprador
  razon_social_cliente: string; // razonSocialComprador
  clave_acceso: string; // 49 digits
  subtotal_0: number;
  subtotal_5: number;
  subtotal_8: number;
  subtotal_15: number;
  iva: number;
  total: number;
}

/**
 * Resultado del parseo de XMLs de ventas
 */
export interface VentasXMLParseResult {
  ventas: VentaXmlParsed[];
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
      throw new Error("Fecha invalida");
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
 * Parsea un solo archivo XML de venta del SRI.
 * Soporta tanto <factura> cruda como envuelta en <autorizacion>.
 */
export function parsearXMLVenta(
  xmlContent: string,
  fileName?: string
): { success: true; venta: VentaXmlParsed } | { success: false; error: string; skipped?: boolean } {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseTagValue: false,
      trimValues: true,
    });

    const parsed = parser.parse(xmlContent);

    let facturaData: Record<string, unknown> | null = null;
    let claveAcceso = "";

    // Case 1: Wrapped in <autorizacion> (like compras)
    if (parsed.autorizacion) {
      const estado = String(parsed.autorizacion.estado || "").toUpperCase();
      if (estado !== "AUTORIZADO") {
        return {
          success: false,
          error: `${fileName || "Archivo"}: Estado "${estado}" (no autorizado)`,
          skipped: true,
        };
      }

      claveAcceso = String(parsed.autorizacion.numeroAutorizacion || "");

      const comprobanteXML = parsed.autorizacion.comprobante;
      if (!comprobanteXML) {
        return {
          success: false,
          error: `${fileName || "Archivo"}: No se encontro el comprobante dentro de la autorizacion`,
        };
      }

      const comprobante = parser.parse(comprobanteXML);
      facturaData =
        comprobante.factura ||
        comprobante.notaCredito ||
        comprobante.notaDebito ||
        comprobante.liquidacionCompra;
    }
    // Case 2: Raw <factura> (ventas propias del contribuyente)
    else if (parsed.factura || parsed.notaCredito || parsed.notaDebito || parsed.liquidacionCompra) {
      facturaData =
        parsed.factura ||
        parsed.notaCredito ||
        parsed.notaDebito ||
        parsed.liquidacionCompra;
    }

    if (!facturaData) {
      return {
        success: false,
        error: `${fileName || "Archivo"}: Estructura XML no reconocida (ni factura cruda ni autorizacion)`,
      };
    }

    const infoTributaria = facturaData.infoTributaria as Record<string, unknown> | undefined;
    const infoFactura = (
      facturaData.infoFactura ||
      facturaData.infoNotaCredito ||
      facturaData.infoNotaDebito ||
      facturaData.infoLiquidacionCompra
    ) as Record<string, unknown> | undefined;

    if (!infoTributaria || !infoFactura) {
      return {
        success: false,
        error: `${fileName || "Archivo"}: Estructura XML incompleta`,
      };
    }

    // If raw factura, get claveAcceso from infoTributaria
    if (!claveAcceso) {
      claveAcceso = String(infoTributaria.claveAcceso || "");
    }

    // Build numero_comprobante
    const estab = String(infoTributaria.estab || "").padStart(3, "0");
    const ptoEmi = String(infoTributaria.ptoEmi || "").padStart(3, "0");
    const secuencial = String(infoTributaria.secuencial || "").padStart(9, "0");
    const numeroComprobante = `${estab}-${ptoEmi}-${secuencial}`;

    // Map tipo_comprobante
    const codDoc = String(infoTributaria.codDoc || "01").padStart(2, "0");
    const tipoComprobante = COD_DOC_MAP[codDoc] || "otros";

    // Fecha de emision
    const fechaEmision = convertirFecha(String(infoFactura.fechaEmision || ""));

    // Compute subtotals from totalConImpuestos
    let subtotal_0 = 0;
    let subtotal_5 = 0;
    let subtotal_8 = 0;
    let subtotal_15 = 0;
    let ivaTotal = 0;

    const totalConImpuestos = infoFactura.totalConImpuestos as Record<string, unknown> | undefined;
    const totalImpuestos = asArray(
      totalConImpuestos?.totalImpuesto as Record<string, unknown> | Record<string, unknown>[] | undefined
    );

    for (const impuesto of totalImpuestos) {
      const codigoPorcentaje = String(impuesto.codigoPorcentaje || "");
      const baseImponible = parseFloat(impuesto.baseImponible as string) || 0;
      const valor = parseFloat(impuesto.valor as string) || 0;

      const mapping = CODIGO_PORCENTAJE_MAP[codigoPorcentaje];
      if (mapping) {
        if (mapping.field === "subtotal_0") {
          subtotal_0 += baseImponible;
        } else if (mapping.field === "subtotal_5") {
          subtotal_5 += baseImponible;
        } else if (mapping.field === "subtotal_iva") {
          const tarifa = parseFloat(impuesto.tarifa as string) || 0;
          if (tarifa > 0 && tarifa <= 8) {
            subtotal_8 += baseImponible;
          } else {
            subtotal_15 += baseImponible;
          }
        }
      } else {
        subtotal_15 += baseImponible;
      }

      ivaTotal += valor;
    }

    const total = parseFloat(infoFactura.importeTotal as string) || 0;

    // Buyer info
    const rucCliente = String(infoFactura.identificacionComprador || "");
    const razonSocialCliente = String(infoFactura.razonSocialComprador || "");

    const venta: VentaXmlParsed = {
      fecha_emision: fechaEmision,
      tipo_comprobante: tipoComprobante,
      numero_comprobante: numeroComprobante,
      ruc_cliente: rucCliente,
      razon_social_cliente: razonSocialCliente,
      clave_acceso: claveAcceso,
      subtotal_0: Math.round(subtotal_0 * 100) / 100,
      subtotal_5: Math.round(subtotal_5 * 100) / 100,
      subtotal_8: Math.round(subtotal_8 * 100) / 100,
      subtotal_15: Math.round(subtotal_15 * 100) / 100,
      iva: Math.round(ivaTotal * 100) / 100,
      total,
    };

    return { success: true, venta };
  } catch (error) {
    console.error("Error parseando XML:", error);
    return {
      success: false,
      error: `${fileName || "Archivo"}: ${error instanceof Error ? error.message : "Error desconocido"}`,
    };
  }
}

/**
 * Parsea multiples archivos XML de ventas
 */
export async function parsearMultiplesXMLVentas(
  files: File[],
  onProgress?: (percent: number) => void
): Promise<VentasXMLParseResult> {
  const ventas: VentaXmlParsed[] = [];
  const errores: string[] = [];
  let skipped = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    try {
      const content = await file.text();
      const result = parsearXMLVenta(content, file.name);

      if (result.success) {
        ventas.push(result.venta);
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

  return { ventas, errores, skipped };
}

/**
 * Valida que el RUC del XML de ventas coincida con el del contribuyente.
 * En ventas, infoTributaria.ruc es el emisor (el contribuyente).
 */
export function validarRucVentasXml(
  data: VentaXmlParsed[],
  contribuyenteRuc: string
): string | null {
  if (data.length === 0) return null;

  // Extract RUC from clave_acceso (positions 10-22, 0-indexed)
  const registroConClave = data.find(
    (v) => v.clave_acceso && v.clave_acceso.replace(/\D/g, "").length >= 49
  );

  if (!registroConClave) return null;

  const claveNumerica = registroConClave.clave_acceso.replace(/\D/g, "");
  const rucArchivo = claveNumerica.substring(10, 23);
  const rucUsuario = contribuyenteRuc.trim();

  const extraerCedula = (ruc: string) => {
    const digitos = ruc.replace(/\D/g, "");
    return digitos.length >= 13 ? digitos.slice(0, 10) : digitos.padStart(10, "0");
  };

  if (extraerCedula(rucArchivo) !== extraerCedula(rucUsuario)) {
    return `Los XML de ventas pertenecen al RUC ${rucArchivo}, pero tu RUC es ${rucUsuario}. Verifica que estes subiendo los archivos correctos.`;
  }

  return null;
}
