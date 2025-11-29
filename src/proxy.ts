// src/proxy.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Next.js 16: proxy substitui middleware.
 * NÃO faça chamadas externas aqui (sem Supabase, sem fetch).
 * Use apenas regras de roteamento simples, quando necessário.
 */
export async function proxy(req: NextRequest) {
  // Ex.: você pode aplicar redirecionamentos estáticos por pathname se precisar,
  // mas a proteção de autenticação será feita dentro de Server Components.
  return NextResponse.next();
}

/**
 * Matcher: aplica proxy a todas as rotas (exceto assets estáticos).
 * Ajuste se necessário.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};