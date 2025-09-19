// supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

/**
 * Retorna o cliente do Supabase se as variáveis estiverem definidas.
 * Caso contrário, loga um aviso e retorna null (a app continua funcionando sem travar).
 */
export function getSupabase(): SupabaseClient | null {
  if (!url || !anon) {
    console.warn(
      '[Supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausentes. ' +
      'Confira em Vercel → Project → Settings → Environment Variables (Production/Preview) e faça um Redeploy.'
    );
    return null;
  }
  if (!client) {
    client = createClient(url, anon);
  }
  return client;
}
