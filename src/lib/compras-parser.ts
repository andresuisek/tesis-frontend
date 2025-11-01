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
 * Parsea un archivo TXT de compras del SRI
 * @param contenido Contenido del archivo como string
 * @returns Array de compras parseadas
 */
export function parsearArchivoCompras(contenido: string): CompraParsed[] {
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
      const valorSinImpuestos = parseFloat(
        columnas[indices.valor_sin_impuestos] || "0"
      );
      const iva = parseFloat(columnas[indices.iva] || "0");
      const total = parseFloat(columnas[indices.importe_total] || "0");

      // Calcular subtotales basados en el IVA
      const { subtotal_0, subtotal_8, subtotal_15 } =
        calcularSubtotales(valorSinImpuestos, iva);

      // Convertir fecha de DD/MM/YYYY a YYYY-MM-DD
      const fechaEmisionOriginal = columnas[indices.fecha_emision] || "";
      const fechaEmision = convertirFecha(fechaEmisionOriginal);

      // Mapear tipo de comprobante
      const tipoComprobanteOriginal = columnas[indices.tipo_comprobante] || "";
      const tipoComprobante = mapearTipoComprobante(tipoComprobanteOriginal);

      const compra: CompraParsed = {
        ruc_proveedor: columnas[indices.ruc_emisor] || "",
        razon_social_proveedor: columnas[indices.razon_social_emisor] || "",
        tipo_comprobante: tipoComprobante,
        numero_comprobante: columnas[indices.serie_comprobante] || "",
        clave_acceso: columnas[indices.clave_acceso] || "",
        fecha_emision: fechaEmision,
        identificacion_receptor: columnas[indices.identificacion_receptor] || "",
        valor_sin_impuesto: valorSinImpuestos,
        iva: iva,
        total: total,
        subtotal_0: subtotal_0,
        subtotal_8: subtotal_8,
        subtotal_15: subtotal_15,
      };

      compras.push(compra);
    } catch (error) {
      console.warn(`Error procesando línea ${i + 1}:`, error);
      // Continuar con la siguiente línea
    }
  }

  return compras;
}

/**
 * Calcula los subtotales basándose en el valor sin impuestos y el IVA
 */
function calcularSubtotales(
  valorSinImpuestos: number,
  iva: number
): { subtotal_0: number; subtotal_8: number; subtotal_15: number } {
  // Si no hay IVA, todo va a subtotal_0
  if (iva === 0) {
    return {
      subtotal_0: valorSinImpuestos,
      subtotal_8: 0,
      subtotal_15: 0,
    };
  }

  // Calcular la tarifa de IVA
  const tarifaIva = iva / valorSinImpuestos;

  // Determinar qué subtotal usar basado en la tarifa
  if (tarifaIva <= 0.001) {
    // ~0%
    return {
      subtotal_0: valorSinImpuestos,
      subtotal_8: 0,
      subtotal_15: 0,
    };
  } else if (tarifaIva >= 0.07 && tarifaIva <= 0.09) {
    // ~8%
    return {
      subtotal_0: 0,
      subtotal_8: valorSinImpuestos,
      subtotal_15: 0,
    };
  } else if (tarifaIva >= 0.14 && tarifaIva <= 0.16) {
    // ~15%
    return {
      subtotal_0: 0,
      subtotal_8: 0,
      subtotal_15: valorSinImpuestos,
    };
  }

  // Por defecto, asumir 15% si no coincide con ninguna tarifa
  return {
    subtotal_0: 0,
    subtotal_8: 0,
    subtotal_15: valorSinImpuestos,
  };
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
  } catch (error) {
    console.warn("Error convirtiendo fecha:", fechaOriginal);
    return dayjs().format("YYYY-MM-DD"); // Fecha actual como fallback
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

