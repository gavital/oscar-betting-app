// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';

// Supabase SSR mockado globalmente
let supabaseStub: any;

// Mock SSR do Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => supabaseStub,
}));

// Mock next/navigation redirect
const redirectMock = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: any[]) => redirectMock(...args),
}));

// Mock next/image -> img
vi.mock('next/image', () => ({
  default: (props: any) => {
    // simplificação: renderiza uma tag img com os props mais importantes
    // evita depender da otimização do next/image em jsdom
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

describe('UI: /bets/[categoryId] - Aposta por Categoria', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    redirectMock.mockReset();
  });

  it('renderiza nominees com pôster e marca a aposta atual; botões habilitados quando bets_open=true', async () => {
    supabaseStub = {
      auth: {
        getUser: async () => ({ data: { user: { id: 'u1', email: 'user@example.com' } } }),
      },
      from(table: string) {
        return {
          select(_cols?: string) {
            if (table === 'categories') {
              return {
                eq: (_f: string, _v: any) => ({
                  single: async () => ({ data: { id: 'cat_1', name: 'Melhor Filme', is_active: true }, error: null }),
                }),
              };
            }
            if (table === 'app_settings') {
              return {
                eq: (_f: string, _v: any) => ({
                  maybeSingle: async () => ({ data: { key: 'bets_open', value: true }, error: null }),
                }),
              };
            }
            if (table === 'nominees') {
              return {
                eq: (_f: string, _v: any) => ({
                  order: async (_k: string) => ({
                    data: [
                      { id: 'n1', name: 'Alpha', tmdb_data: { poster_path: '/a.jpg' } },
                      { id: 'n2', name: 'Beta', tmdb_data: { poster_path: '/b.jpg' } },
                    ],
                    error: null,
                  }),
                }),
              };
            }
            if (table === 'bets') {
              return {
                select: (_?: string) => ({
                  eq: (_f1: string, _v1: any) => ({
                    eq: (_f2: string, _v2: any) => ({
                      maybeSingle: async () => ({ data: { nominee_id: 'n2' }, error: null }),
                    }),
                  }),
                }),
              } as any;
            }
            return { async order() { return { data: [], error: null }; } } as any;
          },
        };
      },
    };

    const Page = (await import('./page')).default;

    // params em Next 16 são Promise; passamos como Promise resolvida
    const ui = await Page({ params: Promise.resolve({ categoryId: 'cat_1' }) as any });
    render(ui);

    // Título e status
    expect(screen.getByText('Melhor Filme')).toBeInTheDocument();
    expect(screen.getByText(/Apostas abertas/i)).toBeInTheDocument();

    // Nominees renderizados com pôsteres (src contendo /w185/)
    const alphaCard = screen.getByText('Alpha').closest('li')!;
    const betaCard = screen.getByText('Beta').closest('li')!;
    expect(within(alphaCard).getByRole('img')).toHaveAttribute('src', expect.stringMatching(/\/w185\/a\.jpg$/));
    expect(within(betaCard).getByRole('img')).toHaveAttribute('src', expect.stringMatching(/\/w185\/b\.jpg$/));

    // "Sua aposta atual" marcada para n2
    expect(within(betaCard).getByText(/Sua aposta atual/i)).toBeInTheDocument();

    // Botão habilitado e com rótulos adequados
    expect(within(betaCard).getByRole('button', { name: /Atualizar Aposta/i })).toBeEnabled();
    expect(within(alphaCard).getByRole('button', { name: /Confirmar Aposta/i })).toBeEnabled();

    // Não deve redirecionar (usuário autenticado)
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('desabilita botões quando bets_open=false', async () => {
    supabaseStub = {
      auth: {
        getUser: async () => ({ data: { user: { id: 'u1', email: 'user@example.com' } } }),
      },
      from(table: string) {
        return {
          select(_cols?: string) {
            if (table === 'categories') {
              return {
                eq: (_f: string, _v: any) => ({
                  single: async () => ({ data: { id: 'cat_1', name: 'Melhor Filme', is_active: true }, error: null }),
                }),
              };
            }
            if (table === 'app_settings') {
              return {
                eq: (_f: string, _v: any) => ({
                  maybeSingle: async () => ({ data: { key: 'bets_open', value: false }, error: null }),
                }),
              };
            }
            if (table === 'nominees') {
              return {
                eq: (_f: string, _v: any) => ({
                  order: async (_k: string) => ({
                    data: [{ id: 'n1', name: 'Alpha', tmdb_data: { poster_path: '/a.jpg' } }],
                    error: null,
                  }),
                }),
              };
            }
            if (table === 'bets') {
              return {
                select: (_?: string) => ({
                  eq: (_f1: string, _v1: any) => ({
                    eq: (_f2: string, _v2: any) => ({
                      maybeSingle: async () => ({ data: null, error: null }),
                    }),
                  }),
                }),
              } as any;
            }
            return { async order() { return { data: [], error: null }; } } as any;
          },
        };
      },
    };

    const Page = (await import('./page')).default;
    const ui = await Page({ params: Promise.resolve({ categoryId: 'cat_1' }) as any });
    render(ui);

    expect(screen.getByText(/Apostas encerradas/i)).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /Encerrado/i });
    expect(btn).toBeDisabled();
  });
});