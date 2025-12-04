'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { confirmBet } from '../actions'

type ConfirmBetState =
  | { ok: true }
  | { ok: false; error: { code: string; message: string; field?: string } }
  | null

type BetConfirmFormProps = {
  categoryId: string
  nomineeId: string
  isSelected?: boolean
  betsOpen?: boolean
}

export default function BetConfirmForm({
  categoryId,
  nomineeId,
  isSelected = false,
  betsOpen = true
}: BetConfirmFormProps) {
  // Ligamos a server action confirmBet via useActionState
  const [state, formAction, pending] = useActionState(async (_prev: ConfirmBetState, formData: FormData) => {
    const res = await confirmBet(formData)
    return res as any
  }, null as ConfirmBetState)

  const router = useRouter()

  useEffect(() => {
    if (!state) return
    if (state.ok) {
      toast.success('Aposta confirmada!', { description: 'Sua escolha foi salva com sucesso.' })
      router.refresh()
      return
    }

    // Erros
    const code = state.error?.code
    const message = state.error?.message || 'Erro ao confirmar aposta.'

    // Tratamentos específicos
    if (code === 'AUTH_NOT_AUTHENTICATED') {
      toast.error('Você precisa fazer login', { description: message })
      router.push('/login')
      return
    }
    if (code === 'AUTH_FORBIDDEN') {
      toast.error('Apostas encerradas', { description: message })
      return
    }
    if (code === 'CATEGORY_NOT_FOUND' || code === 'NOMINEE_NOT_IN_CATEGORY') {
      toast.error('Categoria/Indicado inválido', { description: message })
      return
    }

    // Padrão
    toast.error('Não foi possível salvar sua aposta', { description: message })
  }, [state, router])

  return (
    <form action={formAction} className="w-full">
      <input type="hidden" name="category_id" value={categoryId} />
      <input type="hidden" name="nominee_id" value={nomineeId} />

      <Button
        type="submit"
        disabled={!betsOpen || pending}
        variant={isSelected ? 'outline' : 'default'}
        className="w-full"
      >
        {!betsOpen ? 'Encerrado' : pending ? 'Salvando...' : isSelected ? 'Atualizar Aposta' : 'Confirmar Aposta'}
      </Button>
    </form>
  )
}