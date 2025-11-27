'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import Link from 'next/link'
import { toggleCategoryActive } from './actions'
import { useState } from 'react'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
  max_nominees: number
  is_active: boolean
}

export function CategoryCard({ category }: { category: Category }) {
  const [isActive, setIsActive] = useState(category.is_active)

  const handleToggle = async () => {
    const prevState = isActive
    const newState = !prevState
    setIsActive(newState) // otimista na UI
  
    const result = await toggleCategoryActive(category.id, newState)
  
    if (result?.error) {
      toast.error('Erro', { description: result.error })
      setIsActive(prevState) // reverte na UI
    } else {
      toast.success('Sucesso', { description: 'Categoria atualizada' })
    }
  }

  return (
    <Card id={`category-${category.id}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-lg">{category.name}</CardTitle>
            <CardDescription>
              {category.max_nominees} indicados máximos
            </CardDescription>
          </div>
          <div className={`h-2 w-2 rounded-full ${
            isActive ? 'bg-green-500' : 'bg-gray-300'
          }`} />
        </div>
      </CardHeader>
      <CardContent className="flex justify-between">
        <div className="flex items-center space-x-2">
          <Switch
            checked={isActive}
            onCheckedChange={handleToggle}
          />
          <span className="text-sm">
            {isActive ? 'Ativa' : 'Inativa'}
          </span>
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