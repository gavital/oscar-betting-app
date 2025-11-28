'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import Link from 'next/link'
// import { toast } from 'sonner'
import { showErrorToast, showSuccessToast } from '@/lib/ui/messages'
import { toggleCategoryActiveAction } from './actions'
import { useActionState, useEffect, useState } from 'react'

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
      showErrorToast(state.error)
      // rollback visual caso erro
      setIsActive((prev) => !prev)
      setPending(false)
    }
    if (state.ok === true) {
      showSuccessToast('Categoria atualizada')
      setPending(false)
    }
  }, [state])

  const handleToggle = (checked: boolean) => {
    // UI otimista
    setIsActive(checked)
    setPending(true)

    // Monta FormData programaticamente (sem useRef/form)
    const fd = new FormData()
    fd.set('id', category.id)
    fd.set('nextState', String(checked))
    formAction(fd)
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
        <div className="flex items-center space-x-2">
          <Switch
            checked={isActive}
            onCheckedChange={handleToggle}
            disabled={pending}
          />
          <span className="text-sm">{isActive ? 'Ativa' : 'Inativa'}</span>
        </div>

        <Link href={`/admin/categories/${category.id}/edit`}>
          <Button variant="ghost" size="sm">
            <Pencil className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
