@vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BetConfirmForm from './BetConfirmForm'

// Mock da server action confirmBet
vi.mock('../actions', () => ({
  confirmBet: vi.fn()
}))
import { confirmBet } from '../actions'

// Mock do router e toasts
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

describe('BetConfirmForm (UI): toasts e feedback ao confirmar aposta', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    ;(confirmBet as any).mockReset()
    pushMock.mockReset()
    refreshMock.mockReset()
    toastSuccess.mockReset()
    toastError.mockReset()
  })

  it('mostra toast de sucesso e atualiza a página quando ok=true', async () => {
    ;(confirmBet as any).mockResolvedValueOnce({ ok: true })

    render(<BetConfirmForm categoryId="cat_1" nomineeId="n1" betsOpen={true} />)

    const btn = screen.getByRole('button', { name: /Confirmar Aposta/i })
    fireEvent.click(btn)

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith('Aposta confirmada!', expect.any(Object))
      expect(refreshMock).toHaveBeenCalled()
    })
  })

  it('AUTH_NOT_AUTHENTICATED: mostra toast e redireciona para /login', async () => {
    ;(confirmBet as any).mockResolvedValueOnce({
      ok: false,
      error: { code: 'AUTH_NOT_AUTHENTICATED', message: 'Faça login' }
    })

    render(<BetConfirmForm categoryId="cat_1" nomineeId="n1" betsOpen={true} />)

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Aposta/i }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled()
      const call = toastError.mock.calls[0]
      expect(call?.[0]).toMatch(/Você precisa fazer login/i)
      expect(pushMock).toHaveBeenCalledWith('/login')
    })
  })

  it('AUTH_FORBIDDEN: mostra toast de apostas encerradas e não redireciona', async () => {
    ;(confirmBet as any).mockResolvedValueOnce({
      ok: false,
      error: { code: 'AUTH_FORBIDDEN', message: 'Apostas encerradas' }
    })

    render(<BetConfirmForm categoryId="cat_1" nomineeId="n1" betsOpen={true} />)

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Aposta/i }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled()
      const call = toastError.mock.calls[0]
      expect(call?.[0]).toMatch(/Apostas encerradas/i)
      expect(pushMock).not.toHaveBeenCalled()
    })
  })

  it('CATEGORY_NOT_FOUND: mostra toast de categoria/indicado inválido', async () => {
    ;(confirmBet as any).mockResolvedValueOnce({
      ok: false,
      error: { code: 'CATEGORY_NOT_FOUND', message: 'Categoria inexistente ou inativa' }
    })

    render(<BetConfirmForm categoryId="cat_1" nomineeId="n1" betsOpen={true} />)

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Aposta/i }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled()
      const call = toastError.mock.calls[0]
      expect(call?.[0]).toMatch(/Categoria\/Indicado inválido/i)
    })
  })

  it('NOMINEE_NOT_IN_CATEGORY: mostra toast de categoria/indicado inválido', async () => {
    ;(confirmBet as any).mockResolvedValueOnce({
      ok: false,
      error: { code: 'NOMINEE_NOT_IN_CATEGORY', message: 'Indicado não pertence à categoria informada' }
    })

    render(<BetConfirmForm categoryId="cat_1" nomineeId="n1" betsOpen={true} />)

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Aposta/i }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled()
      const call = toastError.mock.calls[0]
      expect(call?.[0]).toMatch(/Categoria\/Indicado inválido/i)
    })
  })

  it('DB_INSERT_ERROR: mostra toast genérico de falha ao salvar aposta', async () => {
    ;(confirmBet as any).mockResolvedValueOnce({
      ok: false,
      error: { code: 'DB_INSERT_ERROR', message: 'Falha ao salvar' }
    })

    render(<BetConfirmForm categoryId="cat_1" nomineeId="n1" betsOpen={true} />)

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Aposta/i }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled()
      const call = toastError.mock.calls[0]
      expect(call?.[0]).toMatch(/Não foi possível salvar sua aposta/i)
    })
  })

  it('desabilita botão quando betsOpen=false', async () => {
    render(<BetConfirmForm categoryId="cat_1" nomineeId="n1" betsOpen={false} />)
    const btn = screen.getByRole('button', { name: /Encerrado/i })
    expect(btn).toBeDisabled()
  })

  it('indica estado “Salvando...” quando pending', async () => {
    // Simular pending: fazemos a promise não resolver imediatamente
    ;(confirmBet as any).mockImplementationOnce(async () => {
      await new Promise(res => setTimeout(res, 10))
      return { ok: true }
    })

    render(<BetConfirmForm categoryId="cat_1" nomineeId="n1" betsOpen={true} />)
    const btn = screen.getByRole('button', { name: /Confirmar Aposta/i })
    fireEvent.click(btn)

    // Label deve mudar para “Salvando...”
    expect(await screen.findByRole('button', { name: /Salvando.../i })).toBeInTheDocument()
  })
})