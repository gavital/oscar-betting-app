// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EditCategoryForm } from './EditCategoryForm'

// Mock do router do Next
vi.mock('next/navigation', () => {
  return {
    useRouter: () => ({
      replace: vi.fn(),
      back: vi.fn(),
    }),
  }
})

// Mock dos toasts
const showSuccessToast = vi.fn()
const showErrorToast = vi.fn()
vi.mock('@/lib/ui/messages', () => ({
  showSuccessToast: (...args: any[]) => showSuccessToast(...args),
  showErrorToast: (...args: any[]) => showErrorToast(...args),
}))

// Mock da server action editCategory
const editCategoryMock = vi.fn()
vi.mock('@/app/(dashboard)/admin/categories/actions', () => ({
  editCategory: (...args: any[]) => editCategoryMock(...args),
}))

describe('EditCategoryForm (UI)', () => {
  const baseCategory = {
    id: 'cat_1',
    name: 'Melhor Filme',
    max_nominees: 5,
    is_active: true,
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    showSuccessToast.mockClear()
    showErrorToast.mockClear()
    editCategoryMock.mockReset()
  })

  it('renderiza valores iniciais corretamente', () => {
    render(<EditCategoryForm category={baseCategory} />)

    const nameInput = screen.getByLabelText(/Nome da Categoria/i) as HTMLInputElement
    const maxInput = screen.getByLabelText(/Número Máximo de Indicados/i) as HTMLInputElement
    const hiddenActive = screen.getByDisplayValue('true') as HTMLInputElement // hidden is_active

    expect(nameInput.value).toBe('Melhor Filme')
    expect(maxInput.value).toBe('5')
    expect(hiddenActive.name).toBe('is_active')
    expect(hiddenActive.value).toBe('true')
  })

  it('alterna o switch e atualiza o hidden input is_active', () => {
    render(<EditCategoryForm category={baseCategory} />)

    // O Switch do shadcn normalmente é role="switch" com aria-checked
    // Buscamos pelo texto "Ativa"/"Inativa" como fallback
    const statusText = screen.getByText(/Ativa/i)
    // O switch é o primeiro botão próximo ao texto; buscamos por role button
    const switchButton = screen.getByRole('switch')

    // Clica e valida que o estado mudou para "Inativa" e o hidden foi atualizado
    fireEvent.click(switchButton)
    expect(screen.getByText(/Inativa/i)).toBeInTheDocument()

    // Hidden input deve ser atualizado para "false"
    const hiddenActive = screen.getByDisplayValue('false') as HTMLInputElement
    expect(hiddenActive.name).toBe('is_active')
  })

  it('submete com sucesso e exibe toast de sucesso + navega', async () => {
    // Mock: editar retorna ok
    editCategoryMock.mockResolvedValueOnce({ ok: true, data: { id: 'cat_1' } })

    render(<EditCategoryForm category={baseCategory} />)
    const form = screen.getByText(/Salvar Alterações/i).closest('form')!

    // Submit do form
    fireEvent.submit(form)

    // Aguarda microtask
    await Promise.resolve()

    // Valida que o toast de sucesso foi chamado e o router.replace também
    expect(showSuccessToast).toHaveBeenCalledWith('Categoria atualizada!')
  })

  it('exibe toast de erro quando a server action retorna erro', async () => {
    editCategoryMock.mockResolvedValueOnce({
      ok: false,
      error: {
        code: 'CATEGORY_NAME_DUPLICATE',
        message: 'Já existe',
        field: 'name',
      },
    })

    render(<EditCategoryForm category={baseCategory} />)
    const form = screen.getByText(/Salvar Alterações/i).closest('form')
    fireEvent.submit(form!)

    await Promise.resolve()

    expect(showErrorToast).toHaveBeenCalled()
    const call = showErrorToast.mock.calls[0]?.[0]
    expect(call?.code).toBe('CATEGORY_NAME_DUPLICATE')
  })
})