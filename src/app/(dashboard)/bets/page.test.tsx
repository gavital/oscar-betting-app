// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Supabase SSR mockado por variável global por teste
let supabaseStub: any;

// Mock SSR do Supabase (a página importa createServerSupabaseClient)
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => supabaseStub,
}));

// Mock de next/navigation (se redirect for chamado, queremos ver a intenção)
const redirectMock = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: any[]) => redirectMock(...args),
}));

describe('UI: /bets - Minhas Apostas', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    redirectMock.mockReset();
  });

  it('renderiza progresso e lista de categorias com estados (apostada/pendente)', async () => {
    // Mock do supabase SSR
    supabaseStub = {
      auth: {
        getUser: async () => ({ data: { user: { id: 'u1', email: 'user@example.com' } } }),
      },
      from(table: string) {
        return {
          select: function (_cols?: string) {
            // categorias ativas
            if (table === 'categories') {
              return {
                eq: (_f: string, _v: any) => ({
                  order: async (_k: string) => ({
                    data: [
                      { id: 'cat_1', name: 'Melhor Filme', is_active: true },
                      { id: 'cat_2', name: 'Melhor Direção', is_active: true },
                    ],
                    error: null,
                  }),
                }),
              };
            }
            // bets do usuário
            if (table === 'bets') {
              return {
                eq: (_f1: string, _v1: any) => async () => ({
                  data: [{ category_id: 'cat_1', nominee_id: 'n1' }], // apenas cat_1 apostada
                  error: null,
                }),
              } as any;
            }
            return { async order() { return { data: [], error: null }; } } as any;
          },
        };
      },
    };

    // Import depois de preparar mocks
    const Page = (await import('./page')).default;

    render(await Page());
    // Progresso: 1 de 2 (50%)
    expect(screen.getByText(/Progresso:\s*1 de 2 categorias\s*\(50%\)/i)).toBeInTheDocument();

    // Estados de cada categoria
    expect(screen.getByText('Melhor Filme')).toBeInTheDocument();
    expect(screen.getByText('Apostada')).toBeInTheDocument();
    expect(screen.getByText('Editar aposta')).toBeInTheDocument();

    expect(screen.getByText('Melhor Direção')).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByText('Fazer aposta')).toBeInTheDocument();

    // Não deve redirecionar (usuário autenticado)
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('redireciona para /login quando não autenticado', async () => {
    supabaseStub = {
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as any;

    const Page = (await import('./page')).default;
    await Page(); // chamada que tentará renderizar e chamará redirect('/login')

    expect(redirectMock).toHaveBeenCalledWith('/login');
  });
});