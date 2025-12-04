'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { setResultsPublished } from '../actions'

type FormState =
  | { ok: true; data?: { published: boolean } }
  | { ok: false; error: { code: string; message: string } }
  | null

export default function SettingsResultsForm({
  currentPublished
}: {
  currentPublished: boolean
}) {
  const [state, formAction, pending] = useActionState(async (_prev: FormState, fd: FormData) => {
    const res = await setResultsPublished(fd)
    return res as any
  }, null as FormState)

  const router = useRouter()

  useEffect(() => {
    if (!state) return
    if (state.ok) {
      const published = !!state.data?.published
      toast.success(published ? 'Resultados publicados' : 'Resultados ocultados', {
        description: published
          ? 'Ranking e detalhes ficam visíveis para todos.'
          : 'Ranking e detalhes ficam visíveis somente conforme políticas internas.'
      })
      router.refresh()
      return
    }

    const code = state.error?.code
    const message = state.error?.message || 'Falha ao atualizar publicação de resultados.'
    if (code === 'AUTH_FORBIDDEN' || code === 'AUTH_NOT_AUTHENTICATED') {
      toast.error('Acesso negado', { description: message })
      return
    }

    toast.error('Não foi possível atualizar a publicação de resultados', { description: message })
  }, [state, router])

  const nextState = currentPublished ? 'false' : 'true'
  const label = currentPublished ? 'Ocultar Resultados' : 'Publicar Resultados'
  const variant = currentPublished ? 'destructive' : 'default'

  return (
    <form action={formAction} className="flex items-center gap-3">
      <input type="hidden" name="published" value={nextState} />
      <Button type="submit" variant={variant as any} disabled={pending}>
        {pending ? 'Salvando...' : label}
      </Button>
    </form>
  )
}