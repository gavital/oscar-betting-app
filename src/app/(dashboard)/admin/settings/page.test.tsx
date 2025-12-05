// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Stub SSR
let supabaseStub: any

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => supabaseStub,
}))

const redirectMock = vi.fn()
vi.mock('next/navigation', () => ({
  redirect: (...args: any[]) => redirectMock(...args),
}))

describe('AdminSettingsPage (SSR): exibe estado atual de bets_open', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    redirectMock.mockReset()
  })

  it('exibe APOSTAS ABERTAS quando não há app_settings', async () => {
    supabaseStub = {
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
      from(table: string) {
        return {
          select(_cols?: string) {
            if (table === 'profiles') {
              return {
                eq: (_f: string, _v: any) => ({
                  maybeSingle: async () => ({ data: { role: 'admin' }, error: null })
                }),
              }
            }
            if (table === 'app_settings') {
              return {
                eq: (_f: string, _v: any) => ({
                  maybeSingle: async () => ({ data: null, error: null })
                })
              }
            }
            return { async order() { return { data: [], error: null } } } as any
          }
        }
      }
    }

    const Page = (await import('./page')).default
    render(await Page())

    expect(screen.getByText(/APOSTAS ABERTAS/i)).toBeInTheDocument()
  })

  it('exibe APOSTAS FECHADAS quando bets_open=false', async () => {
    supabaseStub = {
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
      from(table: string) {
        return {
          select(_cols?: string) {
            if (table === 'profiles') {
              return {
                eq: (_f: string, _v: any) => ({
                  maybeSingle: async () => ({ data: { role: 'admin' }, error: null })
                }),
              }
            }
            if (table === 'app_settings') {
              return {
                eq: (_f: string, _v: any) => ({
                  maybeSingle: async () => ({ data: { key: 'bets_open', value: false }, error: null })
                })
              }
            }
            return { async order() { return { data: [], error: null } } } as any
          }
        }
      }
    }

    const Page = (await import('./page')).default
    render(await Page())

    expect(screen.getByText(/APOSTAS FECHADAS/i)).toBeInTheDocument()
  })
})