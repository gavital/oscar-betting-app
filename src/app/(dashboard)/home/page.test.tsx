// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

let supabaseStub: any
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => supabaseStub
}))
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />
}))

describe('HomePage (SSR): status, estatísticas e banner', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('exibe APOSTAS ABERTAS e RESULTADOS OCULTOS com estatísticas e ações', async () => {
    supabaseStub = {
      from(table: string) {
        return {
          select(_cols?: string) {
            if (table === 'app_settings') {
              // bets_open: true, results_published: false
              return {
                eq: (key: string, value: any) => ({
                  maybeSingle: async () => ({
                    data: value === 'bets_open'
                      ? { key: 'bets_open', value: true }
                      : { key: 'results_published', value: false },
                    error: null
                  })
                })
              } as any
            }
            if (table === 'profiles') {
              return {
                // await supabase.from('profiles').select('id')
                async select() {
                  return { data: [{ id: 'u1' }, { id: 'u2' }], error: null }
                }
              } as any
            }
            if (table === 'bets') {
              return {
                async select() {
                  return { data: [{ id: 'b1' }], error: null }
                }
              } as any
            }
            if (table === 'categories') {
              // await supabase.from('categories').select('id, name').eq('is_active', true)
              return {
                eq: async (_f: string, _v: any) => ({ data: [{ id: 'cat_1' }, { id: 'cat_2' }], error: null })
              } as any
            }
            if (table === 'nominees') {
              // await supabase.from('nominees').select('name, tmdb_data').limit(12)
              return {
                limit: async (_n: number) => ({ data: [], error: null })
              } as any
            }
            return { async order() { return { data: [], error: null } } } as any
          }
        }
      }
    }

    const Page = (await import('./page')).default
    render(await Page())

    expect(screen.getByText(/APOSTAS ABERTAS/i)).toBeInTheDocument()
    expect(screen.getByText(/RESULTADOS OCULTOS/i)).toBeInTheDocument()
    expect(screen.getByText(/Participantes/i)).toBeInTheDocument()
    expect(screen.getByText(/Apostas Registradas/i)).toBeInTheDocument()
    expect(screen.getByText(/Categorias Ativas/i)).toBeInTheDocument()
    expect(screen.getByText(/Minhas Apostas/i)).toBeInTheDocument()
    expect(screen.getByText(/Ver Ranking/i)).toBeInTheDocument()
  })

  it('exibe RESULTADOS PUBLICADOS e pódio quando published=true', async () => {
    supabaseStub = {
      from(table: string) {
        return {
          select(_cols?: string) {
            if (table === 'app_settings') {
              return {
                eq: (_f: string, _v: any) => ({
                  maybeSingle: async () => ({
                    data: { key: 'results_published', value: true },
                    error: null
                  })
                })
              } as any
            }
            if (table === 'categories') {
              return {
                eq: async (_f: string, _v: any) => ({ data: [{ id: 'cat_1' }, { id: 'cat_2' }], error: null })
              } as any
            }
            if (table === 'nominees') {
              // await supabase.from('nominees').select('id').eq('is_winner', true)
              return {
                eq: async (_f: string, _v: any) => ({ data: [{ id: 'win_1' }], error: null })
              } as any
            }
            if (table === 'bets') {
              return {
                async select() {
                  return { data: [{ user_id: 'u1', nominee_id: 'win_1' }], error: null }
                }
              } as any
            }
            if (table === 'profiles') {
              return {
                async select() {
                  return { data: [{ id: 'u1', name: 'Alice' }], error: null }
                }
              } as any
            }
            return { async order() { return { data: [], error: null } } } as any
          }
        }
      }
    }

    const Page = (await import('./page')).default
    render(await Page())

    expect(screen.getByText(/RESULTADOS PUBLICADOS/i)).toBeInTheDocument()
    expect(screen.getByText(/Pódio Atual/i)).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })
})