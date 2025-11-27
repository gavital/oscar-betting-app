'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { editCategory } from '@/app/(dashboard)/admin/categories/actions'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import clsx from 'clsx'
import { Switch } from '@/components/ui/switch'

const errorMessages: Record<string, string> = {
  AUTH_NOT_AUTHENTICATED: 'Faça login para continuar.',
  AUTH_FORBIDDEN: 'Você não tem permissão para editar categorias.',
  CATEGORY_NOT_FOUND: 'Categoria não encontrada.',
  CATEGORY_NAME_DUPLICATE: 'Já existe outra categoria com esse nome.',
  VALIDATION_ID_REQUIRED: 'ID da categoria é obrigatório.',
  VALIDATION_NAME_MIN_LENGTH: 'O nome deve ter pelo menos 3 caracteres.',
  VALIDATION_MAX_RANGE: 'Número de indicados deve ser entre 1 e 20.',
  VALIDATION_NO_FIELDS: 'Nenhum campo para atualizar foi fornecido.',
  DB_SELECT_ERROR: 'Erro ao consultar dados. Tente novamente.',
  DB_UPDATE_ERROR: 'Erro ao salvar alterações. Tente novamente.',
  UNKNOWN_ERROR: 'Ocorreu um erro inesperado. Tente novamente.',
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <div className="mr-2 h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
          Salvando...
        </>
      ) : (
        <>
          <Save className="mr-2 h-4 w-4" />
          Salvar Alterações
        </>
      )}
    </Button>
  )
}

export function EditCategoryForm({
  id,
  initialName,
  initialMaxNominees,
  initialIsActive,
}: {
  id: string
  initialName: string
  initialMaxNominees: number
  initialIsActive: boolean
}) {
  const [state, formAction] = useActionState(editCategory, null)
  const [isActive, setIsActive] = useState(initialIsActive)

  const [nameError, setNameError] = useState<string | null>(null)
  const [maxError, setMaxError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (state?.error) {
      const code = state.error.code
      const friendly = errorMessages[code] ?? state.error.message

      // Direciona erro para o campo correto, quando aplicável
      switch (state.error.field) {
        case 'name':
          setNameError(friendly)
          setFormError(null)
          break
        case 'max_nominees':
          setMaxError(friendly)
          setFormError(null)
          break
        default:
          // Erros não associados a campo específico
          setFormError(friendly)
          // Também exibe toast
          toast.error('Erro', { description: friendly })
          break
      }
    }

    if (state?.success || state?.ok) {
      setNameError(null)
      setMaxError(null)
      setFormError(null)
      toast.success('Sucesso', { description: 'Categoria atualizada!' })
    }
  }, [state])

  const validateNameClient = (value: string) => {
    if (!value || value.trim().length < 3) {
      setNameError(errorMessages.VALIDATION_NAME_MIN_LENGTH)
    } else {
      setNameError(null)
    }
  }

  const validateMaxClient = (value: string) => {
    const num = parseInt(value, 10)
    if (!Number.isFinite(num) || num < 1 || num > 20) {
      setMaxError(errorMessages.VALIDATION_MAX_RANGE)
    } else {
      setMaxError(null)
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={id} />

      <div>
        <Label htmlFor="name">Nome da Categoria</Label>
        <Input
          id="name"
          name="name"
          required
          minLength={3}
          defaultValue={initialName}
          onChange={(e) => validateNameClient(e.target.value)}
          aria-invalid={!!nameError}
          className={clsx(!!nameError && 'border-red-500')}
          placeholder="Ex: Melhor Filme"
        />
        {nameError && (
          <p className="mt-1 text-sm text-red-600">{nameError}</p>
        )}
      </div>

      <div>
        <Label htmlFor="max_nominees">Número Máximo de Indicados</Label>
        <Input
          id="max_nominees"
          name="max_nominees"
          type="number"
          required
          min={1}
          max={20}
          defaultValue={String(initialMaxNominees)}
          onChange={(e) => validateMaxClient(e.target.value)}
          aria-invalid={!!maxError}
          className={clsx(!!maxError && 'border-red-500')}
        />
        {maxError && (
          <p className="mt-1 text-sm text-red-600">{maxError}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Mantém o valor no FormData para a Server Action */}
        <input
          type="hidden"
          name="is_active"
          value={isActive ? 'true' : 'false'}
        />

        <Switch
          id="is_active"
          checked={isActive}
          onCheckedChange={setIsActive}
          aria-label="Categoria ativa"
        />
        <Label htmlFor="is_active">Categoria ativa</Label>
      </div>

      {formError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {formError}
        </div>
      )}

      <div className="flex gap-4">
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Cancelar
        </Button>
        <SubmitButton />
      </div>
    </form>
  )
}