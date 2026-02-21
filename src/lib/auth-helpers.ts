import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { User } from "@supabase/supabase-js";

type AuthResult =
  | { authenticated: true; user: User }
  | { authenticated: false; user: null };

/**
 * Validates the user session from a server-side context (API routes, server components).
 * Uses `getUser()` to verify the JWT against the Supabase Auth server.
 */
export async function getAuthenticatedUser(): Promise<AuthResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { authenticated: false, user: null };
  }

  return { authenticated: true, user };
}

/**
 * Verifies that a given RUC belongs to the authenticated user.
 *
 * The user can access a RUC if:
 * 1. They are a contribuyente and the RUC is their own, OR
 * 2. They are a contador with an active assignment to that contribuyente
 *
 * Uses the admin client to bypass RLS and check across tables.
 */
export async function verifyRucOwnership(
  userId: string,
  ruc: string
): Promise<boolean> {
  const supabaseAdmin = getSupabaseAdmin();

  // Check 1: Is the user a contribuyente with this RUC?
  const { data: contribuyente } = await supabaseAdmin
    .from("contribuyentes")
    .select("ruc")
    .eq("user_id", userId)
    .eq("ruc", ruc)
    .maybeSingle();

  if (contribuyente) {
    return true;
  }

  // Check 2: Is the user a contador with an active assignment to this RUC?
  const { data: contador } = await supabaseAdmin
    .from("contadores")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (contador) {
    const { data: asignacion } = await supabaseAdmin
      .from("contador_contribuyente")
      .select("id")
      .eq("contador_id", contador.id)
      .eq("contribuyente_ruc", ruc)
      .eq("estado", "activo")
      .maybeSingle();

    if (asignacion) {
      return true;
    }
  }

  return false;
}



