'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { UserCircle } from 'lucide-react'
import { useSupabase } from '@/providers/SupabaseProvider'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

interface HeaderProps {
  user: any | null
}

interface Profile {
  id: string
  name: string
  role: 'user' | 'admin'
  created_at: string
  updated_at: string
}

export function Header({ user }: HeaderProps) {
  const router = useRouter()
  const supabase = useSupabase()
  const [profile, setProfile] = useState<Profile | null>(null)
  const pathname = usePathname()
  const isActive = (href: string) => pathname?.startsWith(href)

  useEffect(() => {
    let mounted = true
    async function loadProfile() {
      if (!user) {
        setProfile(null)
        return
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (mounted) {
        if (error) {
          // opcional: log para observabilidade
          console.warn('[Header] failed to load profile', error.message)
          setProfile(null)
        } else {
          setProfile(data as Profile)
        }
      }
    }
    loadProfile()
    return () => { mounted = false }
  }, [user, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/home" className="text-2xl font-bold text-purple-600">
            🏆 Oscar Betting
          </Link>
          {/* <Link href="/'home'" className="text-sm text-gray-700 hover:underline">Home</Link> */}

          <nav className="flex items-center space-x-4">
            {user ? (
              <>
                <Link href="/home" aria-label="Home">
                  <Button variant={isActive('/home') ? 'default' : 'ghost'}>Home</Button>
                </Link>
                <Link href="/bets" aria-label="Minhas Apostas">
                  <Button variant={isActive('/bets') ? 'default' : 'ghost'}>Minhas Apostas</Button>
                </Link>
                <Link href="/ranking" aria-label="Ranking">
                  <Button variant={isActive('/ranking') ? 'default' : 'ghost'}>Ranking</Button>
                </Link>

                {profile?.role === 'admin' && (
                  <>
                    <Link href="/admin/categories">
                      <Button variant="ghost">Admin: Categorias</Button>
                    </Link>
                    <Link href="/admin/nominees">
                      <Button variant="ghost">Admin: Indicados</Button>
                    </Link>
                    <Link href="/admin/settings">
                      <Button variant="ghost">Admin: Controle de Apostas</Button>
                    </Link>
                  </>
                )}

                <Button onClick={handleSignOut} variant="outline">
                  Sair
                </Button>

                {/* Avatar/Perfil */}
                <div className="flex items-center space-x-2">
                  <UserCircle className="h-8 w-8 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {profile?.name || user?.email?.split('@')[0] || 'Usuário'}
                  </span>
                </div>
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