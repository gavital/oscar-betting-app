'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface HeaderProps {
  user: User | null
}

export function Header({ user }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-2xl font-bold text-purple-600">
            🏆 Oscar Betting
          </Link>

          <nav className="flex items-center space-x-4">
            {user ? (
              <>
                <Link href="/bets">
                  <Button variant="ghost">Minhas Apostas</Button>
                </Link>
                <Link href="/ranking">
                  <Button variant="ghost">Ranking</Button>
                </Link>
                
                {user.user_metadata?.role === 'admin' && (
                  <Link href="/admin">
                    <Button variant="ghost">Admin</Button>
                  </Link>
                )}

                <Button onClick={handleSignOut} variant="outline">
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Entrar</Button>
                </Link>
                <Link href="/register">
                  <Button>Criar Conta</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}