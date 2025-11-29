// src/lib/supabase/client.ts
'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/**
 * Browser Supabase client (client-side).
 * Requer as envs públicas NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Log útil em dev; evita falhas silenciosas
    console.error('Supabase client misconfigured', { url, hasKey: !!key });
    throw new Error('Supabase client misconfigured: check NEXT_PUBLIC_SUPABASE_URL/ANON_KEY');
  }

  return createBrowserClient<Database>(url, key);
}