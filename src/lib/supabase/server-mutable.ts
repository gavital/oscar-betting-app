// src/lib/supabase/server-mutable.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Helper para rotas de API que precisam persistir/limpar cookies de sessão.
 * Use APENAS em rotas como /api/auth/callback e /api/auth/signout.
 */
export async function createServerSupabaseClientMutable() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Em alguns contextos (RSC) mutação pode falhar; rotas API devem funcionar
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options, maxAge: 0 })
          } catch {
            // Em alguns contextos (RSC) mutação pode falhar; rotas API devem funcionar
          }
        },
      },
    }
  )
}