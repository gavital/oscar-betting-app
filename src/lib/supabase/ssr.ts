// src/lib/supabase/ssr.ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database' // opcional se você usa tipos

/**
 * Server-side Supabase client (SSR / Edge).
 * Usa cookies para sessão. Compatível com Next 16 App Router.
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies() // cookies() agora é assíncrono no Next 16

  const client = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        // Se futuramente precisar persistir sessão na rota (ex. exchangeCodeForSession),
        // implemente set/remove com NextResponse dentro da própria rota (ver observação abaixo).
      },
    }
  )

  return client
}