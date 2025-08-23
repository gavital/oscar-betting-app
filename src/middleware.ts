// src/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => {
          return req.cookies.get(name)?.value;
        },
        set: (name, value, options) => {
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove: (name, options) => {
          res.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Se não estiver autenticado e não estiver acessando rotas de autenticação
  if (!session && !req.nextUrl.pathname.startsWith('/auth/')) {
    const url = new URL('/auth/login', req.url);
    url.searchParams.set('redirectUrl', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Se estiver autenticado e acessando rotas de autenticação
  if (session && req.nextUrl.pathname.startsWith('/auth/')) {
    const url = new URL('/', req.url);
    return NextResponse.redirect(url);
  }

  // Verificar acesso admin para rotas admin
  if (session && req.nextUrl.pathname.startsWith('/admin/')) {
    // Verificar se é admin usando a tabela user_roles
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('is_admin')
      .eq('user_id', session.user.id)
      .single();
      
    if (!userRole?.is_admin) {
      return NextResponse.redirect(new URL('/', req.url));
    }
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