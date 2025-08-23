import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
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
    // O ideal seria verificar direto com o Supabase se é admin
    // mas por limitações do middleware, podemos redirecionar e deixar
    // a verificação específica para ser feita nas páginas de admin
    // Alternativa: usar cookies para armazenar temporariamente o status de admin
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