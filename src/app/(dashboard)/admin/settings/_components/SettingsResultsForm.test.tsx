@vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SettingsResultsForm from './SettingsResultsForm'

vi.mock('../actions', () => ({
  setResultsPublished: vi.fn()
}))
import { setResultsPublished } from '../actions'

const pushMock = vi.fn()
const refreshMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock })
}))

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: (...args: any[]) => toastSuccess(...args),
    error: (...args: any[]) => toastError(...args),
  }
}))

describe('SettingsResultsForm (Admin): publicar resultados', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    ;(setResultsPublished as any).mockReset()
    toastSuccess.mockReset()
    toastError.mockReset()
    refreshMock.mockReset()
  })

  it('publicar resultados: sucesso -> toast e refresh', async () => {
    ;(setResultsPublished as any).mockResolvedValueOnce({ ok: true, data: { published: true } })

    render(<SettingsResultsForm currentPublished={false} />)
    const btn = screen.getByRole('button', { name: /Publicar Resultados/i })
    fireEvent.click(btn)

    await waitFor(() => {
      expect(setResultsPublished).toHaveBeenCalled()
      expect(toastSuccess).toHaveBeenCalled()
      const call = toastSuccess.mock.calls[0]
      expect(call?.[0]).toMatch(/Resultados publicados/i)
      expect(refreshMock).toHaveBeenCalled()
    })
  })

  it('ocultar resultados: sucesso -> toast e refresh', async () => {
    ;(setResultsPublished as any).mockResolvedValueOnce({ ok: true, data: { published: false } })

    render(<SettingsResultsForm currentPublished={true} />)
    const btn = screen.getByRole('button', { name: /Ocultar Resultados/i })
    fireEvent.click(btn)

    await waitFor(() => {
      expect(setResultsPublished).toHaveBeenCalled()
      expect(toastSuccess).toHaveBeenCalled()
      const call = toastSuccess.mock.calls[0]
      expect(call?.[0]).toMatch(/Resultados ocultados/i)
      expect(refreshMock).toHaveBeenCalled()
    })
  })

  it('erro de permissão -> toast de acesso negado', async () => {
    ;(setResultsPublished as any).mockResolvedValueOnce({
      ok: false,
      error: { code: 'AUTH_FORBIDDEN', message: 'Acesso negado' }
    })

    render(<SettingsResultsForm currentPublished={false} />)
    fireEvent.click(screen.getByRole('button', { name: /Publicar Resultados/i }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled()
      const call = toastError.mock.calls[0]
      expect(call?.[0]).toMatch(/Acesso negado/i)
    })
  })

  it('erro genérico -> toast padrão', async () => {
    ;(setResultsPublished as any).mockResolvedValueOnce({
      ok: false,
      error: { code: 'DB_UPDATE_ERROR', message: 'falha' }
    })

    render(<SettingsResultsForm currentPublished={false} />)
    fireEvent.click(screen.getByRole('button', { name: /Publicar Resultados/i }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled()
      const call = toastError.mock.calls[0]
      expect(call?.[0]).toMatch(/Não foi possível atualizar a publicação de resultados/i)
    })
  })

  it('mostra “Salvando...” enquanto pending', async () => {
    ;(setResultsPublished as any).mockImplementationOnce(async () => {
      await new Promise(res => setTimeout(res, 10))
      return { ok: true, data: { published: true } }
    })

    render(<SettingsResultsForm currentPublished={false} />)
    fireEvent.click(screen.getByRole('button', { name: /Publicar Resultados/i }))

    expect(await screen.findByRole('button', { name: /Salvando.../i })).toBeInTheDocument()
  })
})