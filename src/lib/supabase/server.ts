// src/lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createServerSupabaseClient() {
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
            // Em Server Components, mutação de cookies não é permitida; ignorar
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            // Remoção consistente: expira imediatamente
            cookieStore.set({
              name,
              value: '',
              ...options,
              maxAge: 0,
            })
          } catch {
            // Em Server Components, mutação de cookies não é permitida; ignorar
          }
        },
      },
    }
  )
}