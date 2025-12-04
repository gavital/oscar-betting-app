// src/app/(dashboard)/admin/nominees/components/NomineeItemActions.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { enrichNomineeWithTMDB, updateNominee, deleteNominee } from '../actions'

type NomineeItemActionsProps = {
  nominee: { id: string; name: string }
  categoryId: string
}

export function NomineeItemActions({ nominee, categoryId }: NomineeItemActionsProps) {
  return (
    <div className="flex items-center gap-2" data-testid="nominee-item-actions">
      {/* TMDB */}
      <form action={enrichNomineeWithTMDB} data-testid="tmdb-form" className="flex items-center gap-2">
        <input type="hidden" name="nominee_id" value={nominee.id} />
        <input type="hidden" name="category_id" value={categoryId} />
        <input type="hidden" name="type" value="movie" />
        <Input name="name" defaultValue={nominee.name} className="text-sm w-56" placeholder="Título do filme" />
        <Button variant="outline" className="text-sm">Buscar TMDB</Button>
      </form>

      {/* Update Name */}
      <form action={updateNominee} data-testid="update-form" className="flex items-center gap-2">
        <input type="hidden" name="id" value={nominee.id} />
        <Input name="name" defaultValue={nominee.name} className="text-sm w-56" />
        <Button variant="outline" className="text-sm">Salvar</Button>
      </form>

      {/* Delete */}
      <form action={deleteNominee} data-testid="delete-form">
        <input type="hidden" name="id" value={nominee.id} />
        <Button variant="destructive" className="text-sm">Excluir</Button>
      </form>
    </div>
  )
}