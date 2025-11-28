// src/app/(dashboard)/admin/nominees/page.tsx
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

export default async function AdminNomineesPage() {
  const supabase = await createServerSupabaseClient()

  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .select('id, name, max_nominees, is_active')
    .order('name')

  if (catErr) {
    return (
      <div>
        <h2 className="text-2xl font-semibold">Gestão de Indicados</h2>
        <p className="text-red-600 text-sm">Erro ao carregar categorias: {catErr.message}</p>
      </div>
    )
  }

  // Contagem de indicados por categoria
  const { data: nominees, error: nomErr } = await supabase
    .from('nominees')
    .select('category_id')

  const counts = new Map<string, number>()
  nominees?.forEach(n => counts.set(n.category_id, (counts.get(n.category_id) ?? 0) + 1))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Gestão de Indicados</h2>
          <p className="text-sm text-gray-600">Importe ou cadastre individualmente os indicados por categoria</p>
        </div>
        <Link href="/admin/categories">
          <Button variant="outline">Voltar para Categorias</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories?.map(cat => {
          const count = counts.get(cat.id) ?? 0
          return (
            <Link key={cat.id} href={`/admin/nominees/${cat.id}`} className="border rounded p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{cat.name}</h3>
                  <p className="text-sm text-gray-600">{count} / {cat.max_nominees} indicados</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {cat.is_active ? 'Ativa' : 'Inativa'}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}