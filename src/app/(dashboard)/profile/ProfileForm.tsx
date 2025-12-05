// src/app/(dashboard)/profile/ProfileForm.tsx
'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProfile } from './actions'

type State =
  | { ok: true; data?: { name: string } }
  | { ok: false; error: { code: string; message: string } }
  | null

export default function ProfileForm({ currentName }: { currentName: string }) {
  const [name, setName] = useState(currentName ?? '')
  const router = useRouter()
  const [state, formAction, pending] = useActionState(async (_prev: State, fd: FormData) => {
    if (!fd.get('name')) fd.set('name', name)
    const res = await updateProfile(fd)
    return res as any
  }, null as State)

  useEffect(() => {
    if (!state) return
    if (state.ok) {
      toast.success('Perfil atualizado', { description: 'Seu nome foi alterado com sucesso.' })
      router.refresh()
      return
    }
    toast.error('Falha ao atualizar perfil', { description: state.error?.message ?? 'Tente novamente.' })
  }, [state, router])

  return (
    <form action={formAction} className="space-y-6 max-w-md">
      <div>
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>
  )
}