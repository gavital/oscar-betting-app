import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

export default async function BetsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <p className="text-sm text-red-600">Faça login</p>

  const [{ data: categories }, { data: bets }] = await Promise.all([
    supabase.from('categories').select('id, name, is_active').order('name'),
    supabase.from('bets').select('id, category_id, nominee_id').eq('user_id', user.id)
  ])

  const betByCategory = new Map<string, { nominee_id: string }>()
  bets?.forEach(b => betByCategory.set(b.category_id, { nominee_id: b.nominee_id }))

  const total = categories?.length ?? 0
  const filled = categories?.reduce((acc, c) => acc + (betByCategory.has(c.id) ? 1 : 0), 0) ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Minhas Apostas</h2>
          <p className="text-sm text-gray-600">{filled} de {total} categorias preenchidas</p>
        </div>
      </div>

      <ul className="divide-y">
        {categories?.map(c => {
          const hasBet = betByCategory.has(c.id)
          return (
            <li key={c.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{c.name}</span>
                {hasBet ? (
                  <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">Confirmada</span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700">Pendente</span>
                )}
              </div>
              <Link href={`/bets/${c.id}`}>
                <Button variant="outline">{hasBet ? 'Editar' : 'Apostar'}</Button>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}