import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function middleware(request: NextRequest) {
  // Atualiza a sessão do Supabase
  const response = await updateSession(request)

  // Cria cliente Supabase
  const supabase = createServerSupabaseClient()

  // Verifica autenticação
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rotas protegidas
  const protectedRoutes = ['/bets', '/admin', '/ranking']
  const authRoutes = ['/login', '/register', '/confirm']

  const pathname = request.nextUrl.pathname

  // Se estiver em rota protegida e não estiver logado
  if (protectedRoutes.some(route => pathname.startsWith(route)) && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Se estiver em rota de auth e já estiver logado
  if (authRoutes.includes(pathname) && user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}