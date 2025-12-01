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
export async function proxy(_req: NextRequest) {
  return NextResponse.next();
}

/**
 * Matcher:
 * - Única entrada que exclui todas as rotas internas do Next e assets estáticos.
 * - Evita interceptar:
 *   - /_next/static, /_next/image, /_next/data, /_next/server, /_next/webpack-hmr
 *   - favicon.ico
 *   - arquivos estáticos comuns (svg, png, jpg, jpeg, gif, webp, css, js, map)
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/data|_next/server|_next/webpack-hmr|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|map)$).*)',
  ],
};