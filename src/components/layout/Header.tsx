'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { UserCircle } from 'lucide-react'
import { useSupabase } from '@/providers/SupabaseProvider'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { AdminMenu } from '@/components/layout/AdminMenu'

interface HeaderProps {
  user: any | null
  isAdmin?: boolean
}

// interface Profile {
//   id: string
//   name: string
//   role: 'user' | 'admin'
//   created_at: string
//   updated_at: string
// }

export function Header({ user, isAdmin = false }: HeaderProps) {
  const router = useRouter()
  const supabase = useSupabase()
  const pathname = usePathname()
  const isActive = (href: string) => pathname?.startsWith(href)

  const [profileName, setProfileName] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function loadProfileName() {
      if (!user) {
        setProfileName(null)
        return
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .maybeSingle()
      if (!mounted) return
        if (error) {
        console.warn('[Header] failed to load profile name', error.message)
        setProfileName(null)
        } else {
        const nm = (data?.name ?? '').trim()
        setProfileName(nm.length ? nm : null)
      }
    }
    loadProfileName()
    return () => { mounted = false }
  }, [user, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <header className="bg-card shadow-sm border-b relative">
      {/* Skip link para acessibilidade */}
      <a
        href="#main-content"
        className="absolute left-4 top-0 -translate-y-full focus:translate-y-2 transition-all bg-indigo-600 text-white px-3 py-2 rounded"
      >
        Ir para o conteúdo principal
      </a>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/home" className="text-2xl font-bold text-purple-600">
            🏆 Oscar Betting
          </Link>

          <nav className="flex items-center space-x-4" aria-label="Navegação principal">
            {/* Botão de tema */}
            <ThemeToggle />
            
            {user ? (
              <>
                <Link href="/home" aria-current={isActive('/home') ? 'page' : undefined}>
                  <Button variant={isActive('/home') ? 'default' : 'ghost'}>Home</Button>
                </Link>
                <Link href="/bets" aria-current={isActive('/bets') ? 'page' : undefined}>
                  <Button variant={isActive('/bets') ? 'default' : 'ghost'}>Minhas Apostas</Button>
                </Link>
                <Link href="/ranking" aria-current={isActive('/ranking') ? 'page' : undefined}>
                  <Button variant={isActive('/ranking') ? 'default' : 'ghost'}>Ranking</Button>
                </Link>

                {/* ✅ AdminMenu centralizado e controlado por isAdmin */}
                {isAdmin && <AdminMenu />}

                <Button onClick={handleSignOut} variant="outline" aria-label="Sair da conta">
                  Sair
                </Button>

                {/* Avatar/Perfil */}
                <div className="flex items-center space-x-2" aria-label="Perfil do usuário">
                  <UserCircle className="h-8 w-8 text-foreground/70" aria-hidden="true" />
                  <span className="text-sm font-medium text-foreground">
                    {profileName ?? user?.email?.split('@')[0] ?? 'Usuário'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <Link href="/login" aria-label="Entrar">
                  <Button variant="ghost">Entrar</Button>
                </Link>
                <Link href="/register" aria-label="Criar Conta">
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