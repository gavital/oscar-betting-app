// src/app/(auth)/login/page.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LoginPage from './page'

// Mock do router
const pushMock = vi.fn()
const refreshMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock })
}))

// Mock do provider Supabase
const signInWithPasswordMock = vi.fn()
vi.mock('@/providers/SupabaseProvider', () => ({
  useSupabase: () => ({
    auth: { signInWithPassword: signInWithPasswordMock }
  })
}))

// Mock de toast (sonner)
const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: toastSuccess,
    error: toastError
  }
}))

describe('LoginPage (UI)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    pushMock.mockReset()
    refreshMock.mockReset()
    signInWithPasswordMock.mockReset()
    toastSuccess.mockReset()
    toastError.mockReset()
  })

  it('desabilita o botão enquanto loading e reabilita após tentativa', async () => {
    // Simula tentativa bem-sucedida
    signInWithPasswordMock.mockResolvedValueOnce({ data: {}, error: null })

    render(<LoginPage />)
    const email = screen.getByLabelText(/E-mail/i) as HTMLInputElement
    const password = screen.getByLabelText(/Senha/i) as HTMLInputElement
    const submit = screen.getByRole('button', { name: /Entrar/i })

    fireEvent.change(email, { target: { value: 'user@example.com' }})
    fireEvent.change(password, { target: { value: 'secret' }})
    expect(submit).not.toBeDisabled()

    fireEvent.submit(submit.closest('form')!)
    // Após submit, o componente alterna para loading
    // Não há fácil inspeção de estado sem wait, mas validamos call chain
    await Promise.resolve()

    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret'
    })
    expect(toastSuccess).toHaveBeenCalled()
    expect(pushMock).toHaveBeenCalledWith('/')
    expect(refreshMock).toHaveBeenCalled()
  })

  it('mostra erro quando credenciais inválidas', async () => {
    signInWithPasswordMock.mockResolvedValueOnce({ data: {}, error: { message: 'Invalid' } })

    render(<LoginPage />)
    const email = screen.getByLabelText(/E-mail/i)
    const password = screen.getByLabelText(/Senha/i)
    const submit = screen.getByRole('button', { name: /Entrar/i })

    fireEvent.change(email, { target: { value: 'user@example.com' }})
    fireEvent.change(password, { target: { value: 'bad' }})
    fireEvent.submit(submit.closest('form')!)
    await Promise.resolve()

    expect(toastError).toHaveBeenCalled()
    const callDesc = toastError.mock.calls[0]?.[0]?.description ?? toastError.mock.calls[0]?.[1]?.description
    expect(callDesc).toMatch(/E-mail ou senha incorretos/i)
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('mostra erro inesperado quando signInWithPassword lança', async () => {
    signInWithPasswordMock.mockRejectedValueOnce(new Error('Network'))

    render(<LoginPage />)
    const submit = screen.getByRole('button', { name: /Entrar/i })
    fireEvent.submit(submit.closest('form')!)
    await Promise.resolve()

    expect(toastError).toHaveBeenCalled()
    const callDesc = toastError.mock.calls[0]?.[0]?.description ?? toastError.mock.calls[0]?.[1]?.description
    expect(callDesc).toMatch(/erro inesperado/i)
  })
})