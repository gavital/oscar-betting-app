'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { editCategory } from '@/app/(dashboard)/admin/categories/actions'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useRouter } from 'next/navigation'

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
  category,
}: {
  category: { id: string; name: string; max_nominees: number; is_active: boolean }
}) {
  const [state, formAction] = useActionState(editCategory, null)
  // ✅ fallback defensivo para evitar crash se a prop vier faltando
  const [active, setActive] = useState<boolean>(category?.is_active ?? false)
  const router = useRouter()

  useEffect(() => {
    if (!state) return
    if (state.ok === false && state.error) {
      toast.error('Erro', { description: state.error.message })
      return
    }
    if (state.ok === true) {
      toast.success('Sucesso', { description: 'Categoria atualizada!' })
      router.replace(`/admin/categories?highlight=${category.id}`)
    }
  }, [state, router, category.id])

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={category.id} />
      <div>
        <Label htmlFor="name">Nome da Categoria</Label>
        <Input id="name" name="name" defaultValue={category.name} required minLength={3} />
      </div>
      <div>
        <Label htmlFor="max_nominees">Número Máximo de Indicados</Label>
        <Input
          id="max_nominees"
          name="max_nominees"
          type="number"
          min={1}
          max={20}
          defaultValue={category.max_nominees}
          required
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={active} onCheckedChange={(v) => setActive(v)} />
        <input type="hidden" name="is_active" value={String(active)} />
        <span className="text-sm">{active ? 'Ativa' : 'Inativa'}</span>
      </div>
      <div className="flex gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <SubmitButton />
      </div>
    </form>
  )
}

