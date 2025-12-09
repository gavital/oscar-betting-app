'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import Link from 'next/link'
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

  const checkboxId = `nextState-${category.id}`

  return (
    <Card id={`category-${category.id}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-lg">{category.name}</CardTitle>
            <CardDescription>{category.max_nominees} indicados máximos</CardDescription>
          </div>
          <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-muted'}`} />
        </div>
      </CardHeader>

      <CardContent className="flex justify-between">
        {/* Form nativo com checkbox invisível e label que enrola o Switch */}
        <form action={formAction} className="flex items-center space-x-2">
          <input type="hidden" name="id" value={category.id} />

          {/* Checkbox nativo controlado */}
          <input
            id={checkboxId}
            type="checkbox"
            name="nextState"
            checked={isActive}
            onChange={(e) => {
              const checked = e.target.checked
              setIsActive(checked)
              setPending(true)
              e.currentTarget.form?.requestSubmit()
            }}
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
          />

          {/* Label associada ao checkbox: clicar no Switch toggla o checkbox */}
          <label htmlFor={checkboxId} className="flex items-center space-x-2 cursor-pointer">
            <Switch checked={isActive} disabled={pending} />
            <span className="text-sm">{isActive ? 'Ativa' : 'Inativa'}</span>
          </label>

          {/* Fallback de acessibilidade/progressive enhancement */}
          <button type="submit" className="sr-only">Salvar</button>
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
