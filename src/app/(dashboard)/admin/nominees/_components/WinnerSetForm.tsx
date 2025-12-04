'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { setCategoryWinner } from '../../winners/actions'
import { Button } from '@/components/ui/button'

type State =
  | { ok: true; data?: { categoryId: string; nomineeId: string } }
  | { ok: false; error: { code: string; message: string; field?: string } }
  | null

export default function WinnerSetForm({
  categoryId,
  nomineeId,
  disabled,
}: {
  categoryId: string
  nomineeId: string
  disabled?: boolean
}) {
  const [state, formAction, pending] = useActionState(async (_prev: State, fd: FormData) => {
    const res = await setCategoryWinner(fd)
    return res as any
  }, null as State)

  useEffect(() => {
    if (!state) return
    if (state.ok) {
      toast.success('Vencedor registrado', { description: 'Categoria atualizada com sucesso.' })
      return
    }
    const code = state.error?.code
    const message = state.error?.message || 'Falha ao registrar vencedor.'
    if (code === 'AUTH_FORBIDDEN') {
      toast.error('Acesso negado', { description: message })
      return
    }
    toast.error('Não foi possível registrar o vencedor', { description: message })
  }, [state])

  return (
    <form action={formAction} className="inline-flex">
      <input type="hidden" name="category_id" value={categoryId} />
      <input type="hidden" name="nominee_id" value={nomineeId} />
      <Button type="submit" variant="outline" size="sm" disabled={disabled || pending}>
        {pending ? 'Salvando...' : 'Marcar como vencedor'}
      </Button>
    </form>
  )
}