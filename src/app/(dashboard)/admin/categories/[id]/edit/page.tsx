import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { EditCategoryForm } from './EditCategoryForm'
import { notFound } from 'next/navigation'


export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createServerSupabaseClient()
  const { data: category, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !category) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/categories"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para Categorias
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Editar Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <EditCategoryForm category={category} />
        </CardContent>
      </Card>
    </div>
  )
}