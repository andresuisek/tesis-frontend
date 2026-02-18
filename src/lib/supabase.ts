import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Types for our database tables
export type TipoRegimen = "general" | "rimpe_negocio_popular" | "rimpe_emprendedor";

export interface Contribuyente {
  ruc: string;
  first_name?: string;
  last_name?: string;
  estado: "activo" | "inactivo";
  tipo_obligacion: "mensual" | "semestral" | "anual";
  tipo_regimen: TipoRegimen;
  cargas_familiares: number;
  obligado_contab: boolean;
  agente_retencion: boolean;
  telefono?: string;
  email?: string;
  direccion?: string;
  created_at: string;
  updated_at: string;
  user_id?: string; // Foreign key to auth.users
}

export interface ActividadEconomica {
  codigo: string;
  descripcion: string;
  aplica_iva: boolean;
}

export interface ContribuyenteActividad {
  contribuyente_ruc: string;
  actividad_codigo: string;
}

export type TipoComprobante =
  | "factura"
  | "nota_credito"
  | "liquidacion_compra"
  | "retencion"
  | "otros";

export interface Venta {
  id: string;
  contribuyente_ruc: string;
  ruc_cliente?: string;
  razon_social_cliente?: string;
  fecha_emision: string;
  tipo_comprobante: TipoComprobante;
  numero_comprobante: string;
  identificacion_receptor?: string;
  subtotal_0: number;
  subtotal_5: number;
  subtotal_8: number;
  subtotal_15: number;
  iva: number;
  total: number;
  nota_credito_id?: string;
  retencion_id?: string;
  created_at: string;
}

export interface NotaCredito {
  id: string;
  contribuyente_ruc: string;
  fecha_emision: string;
  tipo_comprobante: TipoComprobante;
  numero_comprobante: string;
  subtotal_0: number;
  subtotal_5: number;
  subtotal_8: number;
  subtotal_15: number;
  iva: number;
  total: number;
  created_at: string;
}

export interface Retencion {
  id: string;
  contribuyente_ruc: string;
  tipo_comprobante?: TipoComprobante;
  serie_comprobante?: string;
  clave_acceso?: string;
  fecha_emision: string;
  retencion_iva_percent?: number;
  retencion_valor?: number;
  retencion_renta_percent?: number;
  retencion_renta_valor?: number;
  created_at: string;
}

export type RubroCompra =
  | "no_definido"
  | "vivienda"
  | "alimentacion"
  | "salud"
  | "educacion"
  | "vestimenta"
  | "turismo"
  | "actividad_profesional";

export interface Compra {
  id: string;
  contribuyente_ruc: string;
  ruc_proveedor?: string;
  razon_social_proveedor?: string;
  fecha_emision: string;
  tipo_comprobante?: TipoComprobante;
  numero_comprobante?: string;
  rubro: RubroCompra; // Por defecto será "no_definido" desde la BD
  valor_sin_impuesto: number;
  subtotal_0: number;
  subtotal_5: number;
  subtotal_8: number;
  subtotal_15: number;
  iva: number;
  total: number;
  clave_acceso?: string;
  created_at: string;
}

export interface TaxLiquidation {
  id: string;
  contribuyente_ruc: string;
  fecha_inicio_cierre: string;
  fecha_fin_cierre: string;
  // Legacy columns (kept for backward compatibility)
  total_compras_iva_0: number;
  total_compras_iva_mayor_0: number;
  total_ventas_iva_0: number;
  total_ventas_iva_mayor_0: number;
  total_nc_iva_mayor_0: number;
  total_retenciones_iva_mayor_0: number;
  credito_favor_adquisicion: number;
  credito_favor_retencion: number;
  impuesto_pagar_sri: number;
  impuesto_causado: number;
  // New rate breakdown columns
  total_ventas_base_5?: number;
  total_ventas_base_8?: number;
  total_ventas_base_15?: number;
  total_compras_base_5?: number;
  total_compras_base_8?: number;
  total_compras_base_15?: number;
  // Calculated IVA
  iva_ventas?: number;
  iva_compras?: number;
  // Crédito tributario
  ct_por_adquisicion?: number;
  ct_por_retencion?: number;
  // IVA diferido
  iva_diferido_monto?: number;
  iva_diferido_meses?: number;
  iva_diferido_recibido?: number;
  // Additional
  credito_arrastrado_anterior?: number;
  saldo_a_favor?: number;
  created_at: string;
  deleted_at?: string | null;
}

// =============================================================================
// TIPOS PARA SISTEMA MULTI-ROL (CONTADOR/CONTRIBUYENTE)
// =============================================================================

export type UserType = "contribuyente" | "contador";

export type RelacionEstado = "activo" | "inactivo" | "pendiente";

export interface Contador {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  telefono?: string;
  email: string;
  direccion?: string;
  numero_registro?: string; // Número de registro profesional
  especialidad?: string;
  estado: "activo" | "inactivo";
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ContadorContribuyente {
  id: string;
  contador_id: string;
  contribuyente_ruc: string;
  estado: RelacionEstado;
  fecha_asignacion: string;
  fecha_desactivacion?: string | null;
  created_at: string;
  updated_at: string;
}

// Tipo extendido para mostrar info del contribuyente en la lista del contador
export interface ContadorContribuyenteConDetalle extends ContadorContribuyente {
  contribuyente?: Contribuyente;
}

// Tipo extendido para mostrar info del contador en el perfil del contribuyente
export interface ContribuyenteConContador extends Contribuyente {
  contador?: Contador;
}