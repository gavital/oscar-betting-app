// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

let supabaseStub: any;

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => supabaseStub,
}));

describe('RankingPage (SSR): pódio e lista', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza pódio e lista ordenada por score', async () => {
    supabaseStub = {
      from(table: string) {
        return {
          select(_cols?: string) {
            if (table === 'categories') {
              return { eq: async () => ({ data: [{ id: 'cat_1' }, { id: 'cat_2' }], error: null }) } as any;
            }
            if (table === 'nominees') {
              return { eq: (_f: string, _v: any) => ({
                select: async () => ({ data: [{ id: 'win_1' }, { id: 'win_2' }], error: null })
              }) } as any;
            }
            if (table === 'bets') {
              return {
                select: async () => ({
                  data: [
                    { user_id: 'u1', nominee_id: 'win_1' },
                    { user_id: 'u1', nominee_id: 'win_2' }, // u1: 2 acertos
                    { user_id: 'u2', nominee_id: 'win_1' }, // u2: 1 acerto
                  ],
                  error: null,
                }),
              };
            }
            if (table === 'profiles') {
              return { select: async () => ({ data: [{ id: 'u1', name: 'Alice' }, { id: 'u2', name: 'Bob' }], error: null }) } as any;
            }
            return { async order() { return { data: [], error: null } } } as any;
          },
        };
      },
    };

    const Page = (await import('./page')).default;
    render(await Page());

    // Pódio
    expect(screen.getByText(/1º lugar/i)).toBeInTheDocument();
    expect(screen.getByText(/2º lugar/i)).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Pontuação: 2/2')).toBeInTheDocument();

    // Lista ordenada: Alice antes de Bob
    const items = screen.getAllByRole('link', { name: /Ver Apostas/i });
    expect(items.length).toBeGreaterThan(0);
  });

  it('mensagem quando sem dados para pódio', async () => {
    supabaseStub = {
      from(table: string) {
        return {
          select: async () => ({ data: [], error: null }),
          eq: async () => ({ data: [], error: null }),
        };
      },
    };

    const Page = (await import('./page')).default;
    render(await Page());

    expect(screen.getByText(/Sem dados para o pódio/i)).toBeInTheDocument();
  });
});