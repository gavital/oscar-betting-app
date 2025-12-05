import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { TanstackProvider } from '@/providers/TanstackProvider'
import { SupabaseProvider } from '@/providers/SupabaseProvider'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Oscar Betting - Aposte nos vencedores do Oscar!',
  description: 'Aposte com seus amigos nos vencedores do Oscar',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // SSR: tenta obter user e role para exibir link admin
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

  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <SupabaseProvider>
          <TanstackProvider>
            {/* Header global */}
            <header className="border-b bg-white">
              <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                <Link href="/home" className="font-semibold">Oscar Betting App</Link>
                <nav className="flex items-center gap-4">
                  <Link href="/home" className="text-sm text-gray-700 hover:underline">Home</Link>
                  <Link href="/bets" className="text-sm text-gray-700 hover:underline">Minhas Apostas</Link>
                  <Link href="/ranking" className="text-sm text-gray-700 hover:underline">Ranking</Link>
                  {role === 'admin' && (
                    <Link href="/admin/settings" className="text-sm text-indigo-700 hover:underline">
                      Controle de Apostas
                    </Link>
                  )}
                </nav>
              </div>
            </header>

            {children}
            <Toaster richColors />
          </TanstackProvider>
        </SupabaseProvider>
      </body>
    </html>
  )
}