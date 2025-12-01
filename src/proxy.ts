// src/proxy.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Next.js 16: proxy substitui middleware.
 * NÃO faça chamadas externas aqui (sem Supabase, sem fetch).
 * Use apenas regras de roteamento simples, quando necessário.
 *
 * Importante: NÃO interceptar rotas internas do Next (/_next/**),
 * pois isso quebra Server Actions e outras funcionalidades do framework.
 */
export async function proxy(req: NextRequest) {
  return NextResponse.next();
}

/**
 * Matcher:
 * - Aplica proxy a todas as rotas, exceto:
 *   - Rotas internas do Next: /_next/**
 *   - favicon
 *   - assets estáticos comuns (svg, png, jpg, jpeg, gif, webp, css, js, map)
 */
export const config = {
  matcher: [
    '/((?!_next/).*)',
    '/((?!favicon.ico).*)',
    '/((?!.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|map)$).*)',
  ],
};