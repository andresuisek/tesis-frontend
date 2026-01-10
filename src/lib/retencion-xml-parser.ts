import { XMLParser } from "fast-xml-parser";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

/**
 * Interfaz para una retención parseada del XML del SRI
 */
export interface RetencionParsed {
  contribuyente_ruc: string;
  tipo_comprobante: "retencion";
  serie_comprobante: string;
  clave_acceso: string;
  fecha_emision: string; // En formato YYYY-MM-DD
  retencion_iva_percent?: number;
  retencion_valor?: number;
  retencion_renta_percent?: number;
  retencion_renta_valor?: number;
  // Datos adicionales para vincular con venta
  num_doc_sustento?: string; // Número de factura formateado (001-100-000000027)
  num_doc_sustento_raw?: string; // Número original (001100000000027)
  razon_social_emisor?: string; // Quien emite la retención
  ruc_emisor?: string; // RUC del emisor de la retención
}

/**
 * Resultado del parseo de un archivo XML
 */
export interface ParseResult {
  success: boolean;
  retencion?: RetencionParsed;
  error?: string;
  fileName?: string;
}

/**
 * Resultado de la importación con información de vinculación
 */
export interface ImportResult {
  retencion: RetencionParsed;
  ventaEncontrada: boolean;
  ventaId?: string;
  numeroFactura?: string;
  yaExiste?: boolean;
}

/**
 * Transforma el número de documento sustento del formato compacto al formato con guiones
 * Entrada: 001100000000027 (15 caracteres)
 * Salida: 001-100-000000027
 */
export function transformarNumDocSustento(numDocSustento: string): string {
  if (!numDocSustento || numDocSustento.length < 15) {
    return numDocSustento;
  }

  // Limpiar espacios y caracteres no numéricos
  const num = numDocSustento.replace(/\D/g, "");

  if (num.length < 15) {
    return numDocSustento;
  }

  // Formato: AAA-BBB-CCCCCCCCC
  const establecimiento = num.substring(0, 3);
  const puntoEmision = num.substring(3, 6);
  const secuencial = num.substring(6, 15);

  return `${establecimiento}-${puntoEmision}-${secuencial}`;
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
    return dayjs().format("YYYY-MM-DD");
  }
}

/**
 * Parsea el contenido XML de una retención del SRI
 */
export function parsearXMLRetencion(xmlContent: string, fileName?: string): ParseResult {
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
        error: "El archivo no contiene una estructura de autorización válida",
        fileName,
      };
    }

    // El comprobante está dentro de CDATA, necesitamos parsearlo de nuevo
    const comprobanteXML = autorizacion.autorizacion.comprobante;
    if (!comprobanteXML) {
      return {
        success: false,
        error: "No se encontró el comprobante dentro de la autorización",
        fileName,
      };
    }

    // Segunda pasada: parsear el comprobante de retención
    const comprobante = parser.parse(comprobanteXML);

    if (!comprobante.comprobanteRetencion) {
      return {
        success: false,
        error: "El archivo no contiene un comprobante de retención válido",
        fileName,
      };
    }

    const retencionXML = comprobante.comprobanteRetencion;
    const infoTributaria = retencionXML.infoTributaria;
    const infoCompRetencion = retencionXML.infoCompRetencion;
    const docsSustento = retencionXML.docsSustento;

    if (!infoTributaria || !infoCompRetencion) {
      return {
        success: false,
        error: "Estructura del XML incompleta: falta infoTributaria o infoCompRetencion",
        fileName,
      };
    }

    // Construir serie del comprobante
    const estab = String(infoTributaria.estab || "").padStart(3, "0");
    const ptoEmi = String(infoTributaria.ptoEmi || "").padStart(3, "0");
    const secuencial = String(infoTributaria.secuencial || "").padStart(9, "0");
    const serieComprobante = `${estab}-${ptoEmi}-${secuencial}`;

    // Extraer retenciones (pueden ser múltiples)
    let retencionIvaPercent: number | undefined;
    let retencionIvaValor: number | undefined;
    let retencionRentaPercent: number | undefined;
    let retencionRentaValor: number | undefined;
    let numDocSustentoRaw: string | undefined;

    if (docsSustento?.docSustento) {
      const docSustento = Array.isArray(docsSustento.docSustento)
        ? docsSustento.docSustento[0]
        : docsSustento.docSustento;

      numDocSustentoRaw = String(docSustento.numDocSustento || "");

      if (docSustento.retenciones?.retencion) {
        const retenciones = Array.isArray(docSustento.retenciones.retencion)
          ? docSustento.retenciones.retencion
          : [docSustento.retenciones.retencion];

        for (const ret of retenciones) {
          const codigo = Number(ret.codigo);
          const porcentaje = parseFloat(ret.porcentajeRetener) || 0;
          const valor = parseFloat(ret.valorRetenido) || 0;

          if (codigo === 1) {
            // Retención de Renta
            retencionRentaPercent = porcentaje;
            retencionRentaValor = valor;
          } else if (codigo === 2) {
            // Retención de IVA
            retencionIvaPercent = porcentaje;
            retencionIvaValor = valor;
          }
        }
      }
    }

    const retencion: RetencionParsed = {
      contribuyente_ruc: String(infoCompRetencion.identificacionSujetoRetenido || ""),
      tipo_comprobante: "retencion",
      serie_comprobante: serieComprobante,
      clave_acceso: String(infoTributaria.claveAcceso || ""),
      fecha_emision: convertirFecha(String(infoCompRetencion.fechaEmision || "")),
      retencion_iva_percent: retencionIvaPercent,
      retencion_valor: retencionIvaValor,
      retencion_renta_percent: retencionRentaPercent,
      retencion_renta_valor: retencionRentaValor,
      num_doc_sustento_raw: numDocSustentoRaw,
      num_doc_sustento: numDocSustentoRaw ? transformarNumDocSustento(numDocSustentoRaw) : undefined,
      razon_social_emisor: String(infoTributaria.razonSocial || ""),
      ruc_emisor: String(infoTributaria.ruc || ""),
    };

    return {
      success: true,
      retencion,
      fileName,
    };
  } catch (error) {
    console.error("Error parseando XML:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al parsear el XML",
      fileName,
    };
  }
}

/**
 * Parsea múltiples archivos XML
 */
export async function parsearMultiplesXML(files: File[]): Promise<ParseResult[]> {
  const results: ParseResult[] = [];

  for (const file of files) {
    try {
      const content = await file.text();
      const result = parsearXMLRetencion(content, file.name);
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        error: `Error leyendo archivo: ${error instanceof Error ? error.message : "Error desconocido"}`,
        fileName: file.name,
      });
    }
  }

  return results;
}

/**
 * Calcula el total de una retención
 */
export function calcularTotalRetencion(retencion: RetencionParsed): number {
  return (retencion.retencion_valor || 0) + (retencion.retencion_renta_valor || 0);
}




