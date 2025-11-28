'use client'

import { useCallback } from 'react'
import { deleteNominee } from '../actions'
import { Button } from '@/components/ui/button'

type Props = {
  id: string
}

export function ConfirmDeleteNomineeForm({ id }: Props) {
  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    // Confirmação no cliente
    if (!confirm('Confirmar remoção do indicado?')) {
      e.preventDefault()
    }
  }, [])

  return (
    <form action={deleteNominee} onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={id} />
      <Button variant="destructive" className="text-sm" type="submit">
        Excluir
      </Button>
    </form>
  )
}