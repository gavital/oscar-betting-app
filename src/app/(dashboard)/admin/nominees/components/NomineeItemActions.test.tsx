// src/app/(dashboard)/admin/nominees/components/NomineeItemActions.test.tsx
// @vitest-environment jsdom
import { act } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { NomineeItemActions } from './NomineeItemActions'

// Mock das server actions
const enrichMock = vi.fn()
const updateMock = vi.fn()
const deleteMock = vi.fn()
vi.mock('../actions', () => ({
  enrichNomineeWithTMDB: (...args: any[]) => enrichMock(...args),
  updateNominee: (...args: any[]) => updateMock(...args),
  deleteNominee: (...args: any[]) => deleteMock(...args),
}))

describe('NomineeItemActions (UI)', () => {
  const nominee = { id: 'n1', name: 'Movie A' }
  const categoryId = 'cat_1'

  beforeEach(() => {
    vi.restoreAllMocks()
    enrichMock.mockReset()
    updateMock.mockReset()
    deleteMock.mockReset()
  })

  it('renderiza e submete o formulário TMDB com valores corretos', async () => {
    enrichMock.mockResolvedValueOnce({ ok: true })

    render(<NomineeItemActions nominee={nominee} categoryId={categoryId} />)
    const form = screen.getByTestId('tmdb-form')
    const nameInput = screen.getByPlaceholderText(/Título do filme/i) as HTMLInputElement

    expect(nameInput.value).toBe('Movie A')

    fireEvent.submit(form)
    await Promise.resolve()

    // Verifica que a action foi chamada
    expect(enrichMock).toHaveBeenCalledTimes(1)
    const formDataArg = enrichMock.mock.calls[0]?.[0] as FormData
    expect(String(formDataArg.get('nominee_id'))).toBe('n1')
    expect(String(formDataArg.get('category_id'))).toBe('cat_1')
    expect(String(formDataArg.get('name'))).toBe('Movie A')
    expect(String(formDataArg.get('type'))).toBe('movie')
  })

  it('submete atualização de nome', async () => {
    updateMock.mockResolvedValueOnce({ ok: true })

    render(<NomineeItemActions nominee={nominee} categoryId={categoryId} />)
    const form = screen.getByTestId('update-form')
    const nameInput = within(form).getByDisplayValue('Movie A') as HTMLInputElement

    fireEvent.change(nameInput, { target: { value: 'Movie B' } })
    fireEvent.submit(form)
    await Promise.resolve()

    expect(updateMock).toHaveBeenCalledTimes(1)
    const formDataArg = updateMock.mock.calls[0]?.[0] as FormData
    expect(String(formDataArg.get('id'))).toBe('n1')
    expect(String(formDataArg.get('name'))).toBe('Movie B')
  })

  it('submete exclusão', async () => {
    deleteMock.mockResolvedValueOnce({ ok: true })

    render(<NomineeItemActions nominee={nominee} categoryId={categoryId} />)
    const form = screen.getByTestId('delete-form')

    await act(async () => {
      fireEvent.submit(form)
    })
    await Promise.resolve()

    expect(deleteMock).toHaveBeenCalledTimes(1)
    const formDataArg = deleteMock.mock.calls[0]?.[0] as FormData
    expect(String(formDataArg.get('id'))).toBe('n1')
  })
})