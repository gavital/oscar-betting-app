import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { TanstackProvider } from '@/providers/TanstackProvider'
import { SupabaseProvider } from '@/providers/SupabaseProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Oscar Betting - Aposte nos vencedores do Oscar!',
  description: 'Aposte com seus amigos nos vencedores do Oscar',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <SupabaseProvider>
          <TanstackProvider>
            {children}
            <Toaster />
          </TanstackProvider>
        </SupabaseProvider>
      </body>
    </html>
  )
}