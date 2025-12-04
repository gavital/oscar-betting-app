'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { setBetsOpen } from '../actions'

type FormState =
  | { ok: true; data?: { open: boolean } }
  | { ok: false; error: { code: string; message: string } }
  | null

export default function SettingsBetsForm({
  currentOpen
}: {
  currentOpen: boolean
}) {
  const [state, formAction, pending] = useActionState(async (_prev: FormState, fd: FormData) => {
    const res = await setBetsOpen(fd)
    return res as any
  }, null as FormState)

  const router = useRouter()

  useEffect(() => {
    if (!state) return
    if (state.ok) {
      const open = !!state.data?.open
      toast.success(open ? 'Apostas reabertas' : 'Apostas encerradas', {
        description: open ? 'Usuários já podem confirmar/atualizar suas apostas.' : 'Nenhuma alteração será permitida.'
      })
      router.refresh()
      return
    }

    const code = state.error?.code
    const message = state.error?.message || 'Falha ao atualizar estado de apostas.'

    if (code === 'AUTH_FORBIDDEN' || code === 'AUTH_NOT_AUTHENTICATED') {
      toast.error('Acesso negado', { description: message })
      return
    }

    toast.error('Não foi possível atualizar o estado de apostas', { description: message })
  }, [state, router])

  const nextState = currentOpen ? 'false' : 'true'
  const label = currentOpen ? 'Encerrar Apostas' : 'Reabrir Apostas'
  const variant = currentOpen ? 'destructive' : 'default'

  return (
    <form action={formAction} className="flex items-center gap-3">
      <input type="hidden" name="open" value={nextState} />
      <Button type="submit" variant={variant as any} disabled={pending}>
        {pending ? 'Salvando...' : label}
      </Button>
    </form>
  )
}