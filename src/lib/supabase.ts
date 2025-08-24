import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database tables
export interface Contribuyente {
  ruc: string;
  first_name?: string;
  last_name?: string;
  estado: "activo" | "inactivo";
  tipo_obligacion: "mensual" | "semestral";
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
