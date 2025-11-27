'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { editCategory } from '@/app/(dashboard)/admin/categories/actions'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'

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

  useEffect(() => {
    if (state?.error) {
      toast.error('Erro', { description: state.error })
    }
    if (state?.success) {
      toast.success('Sucesso', { description: 'Categoria atualizada!' })
    }
  }, [state])

  return (
    <form action={formAction} method="POST" className="space-y-6">
      <input type="hidden" name="id" value={id} />

      <div>
        <Label htmlFor="name">Nome da Categoria</Label>
        <Input
          id="name"
          name="name"
          required
          minLength={3}
          defaultValue={initialName}
          placeholder="Ex: Melhor Filme"
        />
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
        />
      </div>

      {/* Opcional: permitir alterar status aqui também */}
      <div className="flex items-center gap-3">
        <input
          id="is_active"
          name="is_active"
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        <Label htmlFor="is_active">Categoria ativa</Label>
      </div>

      <div className="flex gap-4">
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Cancelar
        </Button>
        <SubmitButton />
      </div>
    </form>
  )
}