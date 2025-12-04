// src/app/(dashboard)/bets/page.tsx
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default async function MyBetsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Categorias ativas
  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .select('id, name, is_active')
    .eq('is_active', true)
    .order('name')

  if (catErr) {
    return <div className="text-sm text-red-600">Erro ao carregar categorias: {catErr.message}</div>
  }

  // Bets do usuário
  const { data: bets, error: betsErr } = await supabase
    .from('bets')
    .select('category_id, nominee_id')
    .eq('user_id', user.id)

  const betByCategory = new Map((bets ?? []).map(b => [b.category_id, b.nominee_id]))
  const total = categories?.length ?? 0
  const completed = (categories ?? []).reduce((acc, cat) => acc + (betByCategory.has(cat.id) ? 1 : 0), 0)
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">Minhas Apostas</h1>
        <p className="text-sm text-gray-600">
          Progresso: {completed} de {total} categorias ({progressPct}%)
        </p>
        {/* Você pode substituir por um componente de Progress caso use uma lib de UI */}
        <div className="w-full bg-gray-200 h-2 rounded mt-2">
          <div className="bg-blue-600 h-2 rounded" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <ul className="divide-y">
        {(categories ?? []).map(cat => {
          const done = betByCategory.has(cat.id)
          return (
            <li key={cat.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="font-medium">{cat.name}</span>
                {done ? (
                  <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">Apostada</span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700">Pendente</span>
                )}
              </div>
              <Link href={`/bets/${cat.id}`}>
                <Button variant={done ? 'outline' : 'default'}>
                  {done ? 'Editar aposta' : 'Fazer aposta'}
                </Button>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}