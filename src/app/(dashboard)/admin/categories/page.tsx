import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { CategoryCard } from './category-card'
import { HighlightAndScroll } from './HighlightAndScroll'

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createServerSupabaseClient()

  const { data: categories, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    return <div>Erro ao carregar categorias: {error.message}</div>
  }

  const sp = searchParams ? await searchParams : undefined
  const highlightParam = Array.isArray(sp?.highlight)
    ? sp?.highlight[0]
    : sp?.highlight

  return (
    <div className="space-y-6">
      {/* Componente client que destaca e faz scroll para o card */}
      <HighlightAndScroll highlightId={highlightParam} />

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Categorias do Oscar</h2>
          <p className="text-sm text-gray-600">Ative/desative e edite as categorias</p>
        </div>
        <Link href="/admin/categories/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Categoria
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories?.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </div>
  )
}
