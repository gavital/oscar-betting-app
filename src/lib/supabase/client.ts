// src/lib/supabase/client.ts
'use client';

import { createClient } from '@supabase/supabase-js';

/**
 * Browser Supabase client (client-side).
 * Necessita das envs públicas NEXT_PUBLIC_* corretamente configuradas.
 */
export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('Supabase client misconfigured', { url, hasKey: !!key });
    throw new Error('Supabase client misconfigured: check NEXT_PUBLIC_SUPABASE_URL/ANON_KEY');
  }

  return createClient(url, key);
}