// src/lib/supabase/server-service.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export function createServerSupabaseServiceClient() {
  // Preferir SUPABASE_URL (server-side), mas aceitar fallback para NEXT_PUBLIC_SUPABASE_URL
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    // Log explícito ajuda no dev
    console.error('Supabase service misconfigured: missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)');
    throw new Error('supabaseUrl is required');
  }
  if (!key) {
    console.error('Supabase service misconfigured: missing SUPABASE_SERVICE_ROLE_KEY');
    throw new Error('supabase service role key is required');
  }

  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}