// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

/**
 * Em Vite, variáveis de ambiente devem começar com VITE_ para
 * serem expostas no browser. Configure-as na Vercel e/ou .env local.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  // Falha cedo e com mensagem clara (aparece no console do navegador).
  throw new Error(
    [
      'Supabase não configurado.',
      'Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em Environment Variables (Vercel) ',
      'ou no seu .env local se rodando em dev.'
    ].join(' ')
  )
}

/**
 * Cliente Supabase para SPA (Vite) com PKCE e sessão persistida.
 * NÃO use keys de service role aqui (apenas no servidor).
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    flowType: 'pkce',
  },
})
