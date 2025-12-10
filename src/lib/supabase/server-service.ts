// src/lib/supabase/server-service.ts
import { createClient } from '@supabase/supabase-js';

export function createServerSupabaseServiceClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}