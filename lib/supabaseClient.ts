import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const APP_SECRET = (import.meta.env.VITE_APP_SHARED_SECRET || '') as string;

// Cliente único do app — já envia o header exigido pelas policies
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    headers: APP_SECRET ? { 'X-App-Secret': APP_SECRET } : undefined,
  },
});
