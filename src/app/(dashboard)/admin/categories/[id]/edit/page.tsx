'use client'

import { useActionState } from 'react'
import { editCategory } from './actions'
import { toast } from 'sonner'
import { useEffect } from 'react'

export default function EditCategoryPage({ params }: { params: { id: string } }) {
  const [state, formAction] = useActionState(editCategory, null)

  useEffect(() => {
    if (state?.error) toast.error('Erro', { description: state.error })
    if (state?.success) toast.success('Sucesso', { description: 'Categoria atualizada!' })
  }, [state])

  return (
    <form action={formAction} method="POST" className="space-y-6">
      <input type="hidden" name="id" value={params.id} />
      {/* inputs para name e max_nominees */}
      {/* botão submit */}
    </form>
  )
}