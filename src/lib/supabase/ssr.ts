// src/lib/supabase/ssr.ts
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Server-side Supabase client (SSR).
 * Usa cookies para sessão. Compatível com Next 16 App Router.
 */
export function getSupabaseServerClient() {
  const cookieStore = cookies();

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
  return client;
}