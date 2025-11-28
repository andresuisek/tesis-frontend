import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Faltan las variables NEXT_PUBLIC_SUPABASE_URL (o SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY para ejecutar consultas seguras."
  );
}

type GenericClient = SupabaseClient<any, "public", any>;
let cachedClient: GenericClient | null = null;

export function getSupabaseAdmin(): GenericClient {
  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    }) as GenericClient;
  }

  return cachedClient;
}

