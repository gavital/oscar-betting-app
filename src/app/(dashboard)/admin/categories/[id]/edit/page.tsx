import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { EditCategoryForm } from './EditCategoryForm'

export default async function EditCategoryPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()

  // Busca categoria
  const { data: category, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error) {
    return <div>Erro ao carregar categoria: {error.message}</div>
  }

  if (!category) {
    return <div>Categoria não encontrada</div>
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/categories" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para Categorias
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Editar Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <EditCategoryForm
            id={category.id}
            initialName={category.name}
            initialMaxNominees={category.max_nominees}
            initialIsActive={category.is_active}
          />
        </CardContent>
      </Card>
    </div>
  )
}