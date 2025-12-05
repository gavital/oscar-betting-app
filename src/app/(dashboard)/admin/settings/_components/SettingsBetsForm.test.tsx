@vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SettingsBetsForm from './SettingsBetsForm'

vi.mock('../actions', () => ({
  setBetsOpen: vi.fn()
}))
import { setBetsOpen } from '../actions'

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

describe('SettingsBetsForm (Admin): toasts e feedback ao alternar bets_open', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    ;(setBetsOpen as any).mockReset()
    toastSuccess.mockReset()
    toastError.mockReset()
    refreshMock.mockReset()
    pushMock.mockReset()
  })

  it('encerrar apostas: sucesso -> toast de encerramento e refresh', async () => {
    ;(setBetsOpen as any).mockResolvedValueOnce({ ok: true, data: { open: false } })

    render(<SettingsBetsForm currentOpen={true} />)
    const btn = screen.getByRole('button', { name: /Encerrar Apostas/i })
    fireEvent.click(btn)

    await waitFor(() => {
      expect(setBetsOpen).toHaveBeenCalled()
      expect(toastSuccess).toHaveBeenCalled()
      const call = toastSuccess.mock.calls[0]
      expect(call?.[0]).toMatch(/Apostas encerradas/i)
      expect(refreshMock).toHaveBeenCalled()
    })
  })

  it('reabrir apostas: sucesso -> toast de reabertura e refresh', async () => {
    ;(setBetsOpen as any).mockResolvedValueOnce({ ok: true, data: { open: true } })

    render(<SettingsBetsForm currentOpen={false} />)
    const btn = screen.getByRole('button', { name: /Reabrir Apostas/i })
    fireEvent.click(btn)

    await waitFor(() => {
      expect(setBetsOpen).toHaveBeenCalled()
      expect(toastSuccess).toHaveBeenCalled()
      const call = toastSuccess.mock.calls[0]
      expect(call?.[0]).toMatch(/Apostas reabertas/i)
      expect(refreshMock).toHaveBeenCalled()
    })
  })

  it('erro de permissão -> toast de acesso negado', async () => {
    ;(setBetsOpen as any).mockResolvedValueOnce({
      ok: false,
      error: { code: 'AUTH_FORBIDDEN', message: 'Acesso negado' }
    })

    render(<SettingsBetsForm currentOpen={true} />)
    fireEvent.click(screen.getByRole('button', { name: /Encerrar Apostas/i }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled()
      const call = toastError.mock.calls[0]
      expect(call?.[0]).toMatch(/Acesso negado/i)
    })
  })

  it('erro genérico -> toast padrão', async () => {
    ;(setBetsOpen as any).mockResolvedValueOnce({
      ok: false,
      error: { code: 'DB_UPDATE_ERROR', message: 'falha' }
    })

    render(<SettingsBetsForm currentOpen={true} />)
    fireEvent.click(screen.getByRole('button', { name: /Encerrar Apostas/i }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled()
      const call = toastError.mock.calls[0]
      expect(call?.[0]).toMatch(/Não foi possível atualizar o estado de apostas/i)
    })
  })

  it('mostra “Salvando...” enquanto pending', async () => {
    ;(setBetsOpen as any).mockImplementationOnce(async () => {
      await new Promise(res => setTimeout(res, 10))
      return { ok: true, data: { open: false } }
    })

    render(<SettingsBetsForm currentOpen={true} />)
    fireEvent.click(screen.getByRole('button', { name: /Encerrar Apostas/i }))

    expect(await screen.findByRole('button', { name: /Salvando.../i })).toBeInTheDocument()
  })
})