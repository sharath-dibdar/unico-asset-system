import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.SUPABASE_URL;
const key = import.meta.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    '[Unico] Supabase env vars missing.\n' +
    'Set SUPABASE_URL and SUPABASE_ANON_KEY in .env.local (dev) ' +
    'or in Hostinger → Environment Variables (production).'
  );
}

export const supabase = createClient(url ?? '', key ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
