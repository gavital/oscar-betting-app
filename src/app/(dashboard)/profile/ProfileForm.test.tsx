@vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ProfileForm from './ProfileForm'

vi.mock('./actions', () => ({
  updateProfile: vi.fn()
}))
import { updateProfile } from './actions'

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

describe('ProfileForm (UI): atualizar nome com toasts', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    ;(updateProfile as any).mockReset()
    toastSuccess.mockReset()
    toastError.mockReset()
    refreshMock.mockReset()
  })

  it('sucesso: mostra toast e refresh', async () => {
    ;(updateProfile as any).mockResolvedValueOnce({ ok: true, data: { name: 'Alice' } })

    render(<ProfileForm currentName="Alice" />)
    fireEvent.click(screen.getByRole('button', { name: /Salvar/i }))

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalled()
      expect(toastSuccess).toHaveBeenCalled()
      expect(refreshMock).toHaveBeenCalled()
    })
  })

  it('erro: mostra toast de erro com descrição', async () => {
    ;(updateProfile as any).mockResolvedValueOnce({
      ok: false,
      error: { code: 'DB_UPDATE_ERROR', message: 'Falha no banco' }
    })

    render(<ProfileForm currentName="Bob" />)
    fireEvent.click(screen.getByRole('button', { name: /Salvar/i }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled()
      const call = toastError.mock.calls[0]
      expect(call?.[1]?.description).toMatch(/Falha no banco/i)
    })
  })

  it('pending: mostra “Salvando...”', async () => {
    ;(updateProfile as any).mockImplementationOnce(async () => {
      await new Promise(res => setTimeout(res, 10))
      return { ok: true, data: { name: 'Carol' } }
    })

    render(<ProfileForm currentName="Carol" />)
    fireEvent.click(screen.getByRole('button', { name: /Salvar/i }))
    expect(await screen.findByRole('button', { name: /Salvando.../i })).toBeInTheDocument()
  })
})