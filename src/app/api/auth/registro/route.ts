import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface RegistroContribuyenteBody {
  type: "contribuyente";
  email: string;
  password: string;
  ruc: string;
  first_name: string;
  last_name: string;
  telefono: string;
  direccion: string;
  cargas_familiares: number;
  obligado_contab: boolean;
  agente_retencion: boolean;
  tipo_obligacion: "mensual" | "semestral";
  actividades_economicas: string[];
}

interface RegistroContadorBody {
  type: "contador";
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  telefono: string;
  direccion: string;
  numero_registro?: string;
  especialidad?: string;
}

type RegistroBody = RegistroContribuyenteBody | RegistroContadorBody;

export async function POST(request: NextRequest) {
  try {
    const body: RegistroBody = await request.json();

    // Crear cliente de Supabase para auth (anon key)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

    // Crear usuario en auth.users
    const { data: authData, error: authError } = await supabaseAuth.auth.signUp(
      {
        email: body.email,
        password: body.password,
        options: {
          data: {
            first_name: body.first_name,
            last_name: body.last_name,
            user_type: body.type,
          },
        },
      }
    );

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Error al crear usuario" },
        { status: 500 }
      );
    }

    // Usar cliente admin para bypasear RLS
    const supabaseAdmin = getSupabaseAdmin();

    if (body.type === "contribuyente") {
      // Crear perfil de contribuyente
      const { error: contribuyenteError } = await supabaseAdmin
        .from("contribuyentes")
        .insert({
          ruc: body.ruc,
          first_name: body.first_name,
          last_name: body.last_name,
          email: body.email,
          telefono: body.telefono,
          direccion: body.direccion,
          cargas_familiares: body.cargas_familiares,
          obligado_contab: body.obligado_contab,
          agente_retencion: body.agente_retencion,
          tipo_obligacion: body.tipo_obligacion,
          estado: "activo",
          user_id: authData.user.id,
        });

      if (contribuyenteError) {
        // Intentar eliminar el usuario de auth si falla la creación del perfil
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json(
          { error: `Error al crear perfil: ${contribuyenteError.message}` },
          { status: 500 }
        );
      }

      // Insertar actividades económicas
      if (body.actividades_economicas.length > 0) {
        const actividadesRelaciones = body.actividades_economicas.map(
          (codigo) => ({
            contribuyente_ruc: body.ruc,
            actividad_codigo: codigo,
          })
        );

        const { error: actividadesError } = await supabaseAdmin
          .from("contribuyente_actividad")
          .insert(actividadesRelaciones);

        if (actividadesError) {
          console.error("Error al asociar actividades:", actividadesError);
          // No es crítico, continuar
        }
      }

      return NextResponse.json({
        success: true,
        message: "Contribuyente registrado exitosamente",
        user_id: authData.user.id,
      });
    } else if (body.type === "contador") {
      // Crear perfil de contador
      const { error: contadorError } = await supabaseAdmin
        .from("contadores")
        .insert({
          first_name: body.first_name,
          last_name: body.last_name,
          email: body.email,
          telefono: body.telefono,
          direccion: body.direccion || null,
          numero_registro: body.numero_registro || null,
          especialidad: body.especialidad || null,
          estado: "activo",
          user_id: authData.user.id,
        });

      if (contadorError) {
        // Intentar eliminar el usuario de auth si falla la creación del perfil
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json(
          { error: `Error al crear perfil: ${contadorError.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Contador registrado exitosamente",
        user_id: authData.user.id,
      });
    }

    return NextResponse.json(
      { error: "Tipo de cuenta no válido" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error en registro:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

