import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  verifyRucOwnership,
} from "@/lib/auth-helpers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

interface RubroSuggestionRequest {
  contribuyenteRuc: string;
  proveedorRucs: string[];
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (!auth.authenticated) {
    return NextResponse.json(
      { error: "No autenticado." },
      { status: 401 }
    );
  }

  try {
    const body: RubroSuggestionRequest = await request.json();

    const contribuyenteRuc = body.contribuyenteRuc?.trim();
    if (!contribuyenteRuc || !body.proveedorRucs?.length) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos." },
        { status: 400 }
      );
    }

    const hasAccess = await verifyRucOwnership(auth.user.id, contribuyenteRuc);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "No tienes acceso a este contribuyente." },
        { status: 403 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Query: for each proveedor RUC, find the most frequent rubro in previous compras
    const { data, error } = await supabaseAdmin
      .from("compras")
      .select("ruc_proveedor, rubro")
      .eq("contribuyente_ruc", contribuyenteRuc)
      .in("ruc_proveedor", body.proveedorRucs)
      .neq("rubro", "no_definido")
      .is("deleted_at", null);

    if (error) {
      console.error("Error fetching rubro suggestions:", error);
      return NextResponse.json(
        { error: "Error al consultar sugerencias." },
        { status: 500 }
      );
    }

    // Group by RUC and find the most frequent rubro for each
    const frecuencias: Record<string, Record<string, number>> = {};
    for (const row of data || []) {
      const ruc = row.ruc_proveedor?.trim();
      const rubro = row.rubro;
      if (!ruc || !rubro) continue;

      if (!frecuencias[ruc]) frecuencias[ruc] = {};
      frecuencias[ruc][rubro] = (frecuencias[ruc][rubro] || 0) + 1;
    }

    const suggestions: Record<string, string> = {};
    for (const [ruc, rubros] of Object.entries(frecuencias)) {
      const sorted = Object.entries(rubros).sort(([, a], [, b]) => b - a);
      if (sorted.length > 0) {
        suggestions[ruc] = sorted[0][0];
      }
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Error in rubro suggestions:", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
