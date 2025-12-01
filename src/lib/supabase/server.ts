// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Server-side Supabase client (SSR/Edge) unificado.
 *
 * Importante:
 * - Em Server Components e Server Actions, NÃO devemos mutar cookies.
 *   Isso evita que o navegador acumule cookies (431 Request Header Fields Too Large).
 * - As rotas de API que realmente precisam ajustar cookies (ex.: callback/signout)
 *   podem ter seus próprios helpers que permitem set/remove.
 */
export async function createServerSupabaseClient() {
  // ✅ Next.js 16: cookies() é uma Dynamic API e retorna uma Promise
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        // No-ops: não mutar cookies em RSC/Actions
        set(_name: string, _value: string, _options: any) {
          // intentionally no-op to avoid cookie bloat in RSC/Server Actions
        },
        remove(_name: string, _options: any) {
          // intentionally no-op to avoid cookie bloat in RSC/Server Actions
        },
      },
    }
  )
}