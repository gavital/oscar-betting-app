// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

let supabaseStub: any;

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => supabaseStub,
}));

describe('UserRankingDetailsPage (SSR): acertos/erros por categoria', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exibe pontuação e lista com “Acertou/Errou”', async () => {
    supabaseStub = {
      from(table: string) {
        return {
          select(cols?: string) {
            if (table === 'profiles') {
              return {
                eq: (_f: string, _v: any) => ({
                  maybeSingle: async () => ({
                    data: { id: 'u1', name: 'Alice' },
                    error: null
                  })
                })
              } as any;
            }
            if (table === 'bets') {
              return {
                  eq: async (_f: string, _v: any) => ({
                    data: [
                      { category_id: 'cat_1', nominee_id: 'n1' },
                      { category_id: 'cat_2', nominee_id: 'n3' }
                    ],
                    error: null
                  })
              } as any;
            }
            if (table === 'nominees') {
              // winners com eq(), ou lista geral sem eq()
                  if (cols?.includes('tmdb_data')) {
          // winners: incluir um winner que faça match com a aposta n1 em cat_1
                    return {
                      eq: async (_f: string, _v: any) => ({
              data: [
                { id: 'n1', category_id: 'cat_1', name: 'Alpha', tmdb_data: {} }, // ✅ faz "Acertou" em cat_1
                { id: 'n2', category_id: 'cat_2', name: 'Beta', tmdb_data: {} },  // winner cat_2 (user apostou n3 → "Errou")
              ],
                        error: null
                      })
                    }
                  }
                  return Promise.resolve({
                    data: [
                      { id: 'n1', category_id: 'cat_1', name: 'Alpha' },
                      { id: 'n2', category_id: 'cat_2', name: 'Beta', is_winner: true }
                    ],
                    error: null
                  })
                }
            if (table === 'categories') {
              return Promise.resolve({
                data: [
                  { id: 'cat_1', name: 'Melhor Filme' },
                  { id: 'cat_2', name: 'Melhor Direção' }
                ],
                error: null
              })
            }
            return { async order() { return { data: [], error: null } } } as any;
          },
        };
      },
    };

    const Page = (await import('./page')).default;
    render(await Page({ params: Promise.resolve({ userId: 'u1' }) as any }));

    expect(screen.getByText(/Alice/i)).toBeInTheDocument();
    expect(screen.getByText(/Pontuação:/i)).toBeInTheDocument();
    expect(screen.getByText(/Acertou/i)).toBeInTheDocument();
    expect(screen.getByText(/Errou/i)).toBeInTheDocument();
  });
});