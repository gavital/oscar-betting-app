'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import Link from 'next/link'
import { toggleCategoryActive } from './actions'
import { useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/ui/messages'
import { showErrorToast, showSuccessToast } from '@/lib/ui/messages'

interface Category {
  id: string
  name: string
  max_nominees: number
  is_active: boolean
}

export function CategoryCard({ category }: { category: Category }) {
  const [isActive, setIsActive] = useState(category.is_active)
  const [pending, setPending] = useState(false)
  const [state, formAction] = useActionState(toggleCategoryActiveAction, null)


  // Feedback centralizado pós resposta do servidor
  useEffect(() => {
    if (!state) return
    if (state.ok === false && state.error) {
      toast.error('Erro', { description: state.error.message /* getErrorMessage(state.error) */ })
      // rollback visual caso erro
      setIsActive((prev) => !prev)
    }
    if (state.ok === true) {
      showSuccessToast('Categoria atualizada')
    }
  }, [state])

  const handleToggle = (checked: boolean) => {
    // Otimista na UI
    setIsActive(checked)

    // Monta FormData e dispara a server action
    if (formRef.current) {
      const fd = new FormData(formRef.current)
      fd.set('nextState', String(checked))
      formAction(fd)
    }
  }

  return (
    <Card id={`category-${category.id}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-lg">{category.name}</CardTitle>
            <CardDescription>{category.max_nominees} indicados máximos</CardDescription>
          </div>
          <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
        </div>
      </CardHeader>
      <CardContent className="flex justify-between">
        {/* Form para enviar toggle via Server Action */}
        <form ref={formRef} action={formAction} className="flex items-center space-x-2">
          <input type="hidden" name="id" value={category.id} />
          <input type="hidden" name="nextState" value={String(isActive)} />
          <Switch checked={isActive} onCheckedChange={handleToggle} />
          <span className="text-sm">{isActive ? 'Ativa' : 'Inativa'}</span>
        </form>

        <Link href={`/admin/categories/${category.id}/edit`}>
          <Button variant="ghost" size="sm">
            <Pencil className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}