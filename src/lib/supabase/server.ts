// src/lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Server-side Supabase client (SSR/Edge) unificado.
 * - Nome padronizado: createServerSupabaseClient (async)
 * - Usa cookies do Next App Router.
 * - set/remove são protegidos com try/catch para evitar erro em RSC.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies() // compatível com Next 16

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
            // Em Server Components, mutação de cookies não é permitida; ignorar
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Em Server Components, mutação de cookies não é permitida; ignorar
          }
        },
      },
    }
  )
}