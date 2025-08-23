// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Verificar se é uma rota admin
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      const url = new URL('/auth/login', req.url);
      url.searchParams.set('redirectTo', req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    
    // Verificar se é admin
    const { data } = await supabase
      .from('user_roles')
      .select('is_admin')
      .eq('user_id', session.user.id)
      .single();
      
    if (!data || !data.is_admin) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // Se não estiver autenticado e não estiver acessando rotas de autenticação
  if (!session && !req.nextUrl.pathname.startsWith('/auth/')) {
    const url = new URL('/auth/login', req.url);
    url.searchParams.set('redirectTo', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Se estiver autenticado e acessando rotas de autenticação
  if (session && req.nextUrl.pathname.startsWith('/auth/')) {
    const url = new URL('/', req.url);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (inside public)
     * - fonts (inside public)
     */
    '/((?!_next/static|_next/image|favicon.ico|images|fonts).*)',
  ],
};