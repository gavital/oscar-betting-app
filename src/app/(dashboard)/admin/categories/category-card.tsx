'use client' // ✅ MARCA COMO CLIENT COMPONENT

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import Link from 'next/link'
import { toggleCategoryActive } from './actions' // ✅ Importa ação diretamente

interface Category {
  id: string
  name: string
  max_nominees: number
  is_active: boolean
}

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-lg">{category.name}</CardTitle>
            <CardDescription>
              {category.max_nominees} indicados máximos
            </CardDescription>
          </div>
          <div className={`h-2 w-2 rounded-full ${
            category.is_active ? 'bg-green-500' : 'bg-gray-300'
          }`} />
        </div>
      </CardHeader>
      <CardContent className="flex justify-between">
        <div className="flex items-center space-x-2">
          <Switch
            checked={category.is_active}
            onCheckedChange={async () => {
              await toggleCategoryActive(category.id, category.is_active)
            }}
          />
          <span className="text-sm">
            {category.is_active ? 'Ativa' : 'Inativa'}
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