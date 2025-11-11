import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Cria cliente Supabase DIRETO no middleware (não use o helper do server.ts)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Verifica autenticação
  const { data: { user } } = await supabase.auth.getUser()

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