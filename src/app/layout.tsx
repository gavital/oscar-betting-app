import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { TanstackProvider } from '@/providers/TanstackProvider'
import { SupabaseProvider } from '@/providers/SupabaseProvider'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Oscar Betting - Aposte nos vencedores do Oscar!',
  description: 'Aposte com seus amigos nos vencedores do Oscar',
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // SSR: tenta obter user e role para exibir link admin (mantido)
  let role: 'admin' | 'user' = 'user'
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      role = (profile?.role ?? 'user').toLowerCase() as any
    }
  } catch {
    // ignora erros, mantemos role=user
  }

  // Tema inicial via cookie para evitar flash (light/dark) – Next 16: cookies() é assíncrono
  const cookieStore = await cookies()
  const themeCookie = cookieStore.get('theme')?.value as 'dark' | 'light' | undefined
  const initialThemeClass = themeCookie === 'dark' ? 'dark' : ''

  return (
    <html
      lang="pt-BR"
      className={`${initialThemeClass} ${inter.className}`}
      suppressHydrationWarning
      data-role={role} // opcional: expõe role no DOM para inspeção/uso
    >
      <body>
        <SupabaseProvider>
          <TanstackProvider>
            {children}
            <Toaster richColors />
          </TanstackProvider>
        </SupabaseProvider>
      </body>
    </html>
  )
}