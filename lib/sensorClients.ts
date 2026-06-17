import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Client Supabase en role "anon" pur, INDEPENDANT de la session du visiteur.
 *
 * Important : certaines tables (g1a_sound, g1a_events) ont une policy RLS
 * reservee au role `anon`. Si on lisait avec la session d'un utilisateur
 * connecte (role `authenticated`), ces lignes deviendraient invisibles. Ce
 * client garantit donc un acces stable a ces tables, que le visiteur soit
 * connecte ou non.
 */
export function anonSensorClient() {
  return createSupabaseClient(url!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
