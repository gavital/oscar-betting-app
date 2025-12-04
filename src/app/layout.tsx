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
            {children}
            <Toaster richColors />
          </TanstackProvider>
        </SupabaseProvider>
      </body>
    </html>
  )
}