// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';

let supabaseStub: any;

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => supabaseStub,
}));
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}));

const confirmBetMock = vi.fn();
vi.mock('@/app/(dashboard)/bets/actions', () => ({
  confirmBet: (...args: any[]) => confirmBetMock(...args),
}));

const pushMock = vi.fn();
const refreshMock = vi.fn();
const redirectMock = vi.fn();

vi.mock('next/navigation', async () => {
  // Se precisar manter algo do módulo original, descomente:
  // const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    // ...(actual as any),
    useRouter: () => ({ push: pushMock, refresh: refreshMock }),
    redirect: (...args: any[]) => { redirectMock(...args); throw new Error(`REDIRECT:${args[0]}`) },
  };
});

describe('UI: /bets/[categoryId] - Aposta por Categoria', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  pushMock.mockReset();
  refreshMock.mockReset();
    redirectMock.mockReset();
    confirmBetMock.mockReset(); // ✅ adiciona este reset
  });

  it('renderiza cards com pôster TMDB, marca “Sua aposta atual” e habilita botões quando bets_open=true', async () => {
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
              // select('nominee_id').eq('user_id', ...).eq('category_id', ...).maybeSingle()
              return {
                eq: (_f1: string, _v1: any) => ({
                  eq: (_f2: string, _v2: any) => ({
                    maybeSingle: async () => ({ data: { nominee_id: 'n2' }, error: null }),
                  }),
                }),
              } as any;
            }
            return { async order() { return { data: [], error: null } } } as any;
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

    // Botões devem estar habilitados
    const atualizarBtn = within(betaCard).getByRole('button', { name: /Atualizar Aposta/i });
    expect(atualizarBtn).toBeEnabled();

    const confirmarBtn = within(alphaCard).getByRole('button', { name: /Confirmar Aposta/i });
    expect(confirmarBtn).toBeEnabled();

    // Integração: clicar em “Confirmar Aposta” deve chamar confirmBet
    fireEvent.click(confirmarBtn);

    await waitFor(() => {
      expect(confirmBetMock).toHaveBeenCalledTimes(1);
      const arg = confirmBetMock.mock.calls[0]?.[0];
      expect(arg).toBeInstanceOf(FormData);
      expect(String(arg.get('category_id'))).toBe('cat_1');
      expect(String(arg.get('nominee_id'))).toBe('n1');
    });
  });

  it('desabilita botões quando bets_open=false e exibe “Encerrado”', async () => {
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
                eq: (_f1: string, _v1: any) => ({
                  eq: (_f2: string, _v2: any) => ({
                    maybeSingle: async () => ({ data: { nominee_id: 'n2' }, error: null }),
                  }),
                }),
              } as any;
            }
            return { async order() { return { data: [], error: null } } } as any;
          },
        };
      },
    };

    const Page = (await import('./page')).default;
    const ui = await Page({ params: Promise.resolve({ categoryId: 'cat_1' }) as any });
    render(ui);

    expect(screen.getByText(/Apostas encerradas/i)).toBeInTheDocument();

    // Botão "Encerrado" desabilitado
    const btn = screen.getByRole('button', { name: /Encerrado/i });
    expect(btn).toBeDisabled();

    // Não deve tentar chamar confirmBet ao clicar (mas por segurança, não clicamos pois está desabilitado)
    expect(confirmBetMock).not.toHaveBeenCalled();
  });
});