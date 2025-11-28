// src/app/(dashboard)/admin/categories/[id]/edit/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { EditCategoryForm } from './EditCategoryForm'
import { notFound } from 'next/navigation' // ✅ importar notFound

export default async function EditCategoryPage({
  params,
}: {
  params: { id: string } // ✅ params NÃO é Promise
}) {
  const { id } = params // ✅ não precisa await

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
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para Categorias
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Editar Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          {/* ✅ passar a prop category inteira, como o componente espera */}
          <EditCategoryForm category={category} />
        </CardContent>
      </Card>
    </div>
  )
}