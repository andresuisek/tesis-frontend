import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  verifyRucOwnership,
} from "@/lib/auth-helpers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

interface ImportProcessRequest {
  contribuyenteRuc: string;
  ventas: Array<{
    tipo_comprobante: string;
    numero_comprobante: string;
    fecha_emision: string;
    ruc_cliente: string;
    razon_social_cliente: string;
    subtotal: number;
    iva: number;
    total: number;
  }>;
  notasCredito: Array<{
    tipo_comprobante: string;
    numero_comprobante: string;
    fecha_emision: string;
    subtotal_0: number;
    subtotal_5: number;
    subtotal_8: number;
    subtotal_15: number;
    iva: number;
    total: number;
  }>;
  compras: Array<{
    tipo_comprobante: string;
    numero_comprobante: string;
    clave_acceso: string;
    fecha_emision: string;
    ruc_proveedor: string;
    razon_social_proveedor: string;
    valor_sin_impuesto: number;
    subtotal_0: number;
    subtotal_5: number;
    subtotal_8: number;
    subtotal_15: number;
    iva: number;
    total: number;
    rubro?: string;
  }>;
  retenciones: Array<{
    serie_comprobante: string;
    clave_acceso: string;
    fecha_emision: string;
    retencion_iva_percent?: number;
    retencion_valor?: number;
    retencion_renta_percent?: number;
    retencion_renta_valor?: number;
    num_doc_sustento?: string;
    ruc_emisor?: string;
  }>;
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (!auth.authenticated) {
    return NextResponse.json(
      { error: "No autenticado. Inicia sesión para continuar." },
      { status: 401 }
    );
  }

  try {
    const body: ImportProcessRequest = await request.json();

    const contribuyenteRuc = body.contribuyenteRuc?.trim();
    if (!contribuyenteRuc) {
      return NextResponse.json(
        { error: "Debes enviar la propiedad 'contribuyenteRuc'." },
        { status: 400 }
      );
    }

    const hasAccess = await verifyRucOwnership(auth.user.id, contribuyenteRuc);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "No tienes acceso a los datos de este contribuyente." },
        { status: 403 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin.rpc("import_periodo_completo", {
      p_ruc: contribuyenteRuc,
      p_ventas: body.ventas,
      p_notas_credito: body.notasCredito || [],
      p_compras: body.compras,
      p_retenciones: body.retenciones,
    });

    if (error) {
      console.error("Error in import_periodo_completo:", error);
      return NextResponse.json(
        { error: "Error al procesar la importación: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in import process:", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
