import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function UserRankingDetailsPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const supabase = await createServerSupabaseClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('id', userId)
    .maybeSingle()

  const displayName = (() => {
    const name = profile?.name?.trim()
    if (name && name.length > 0) return name
    const emailLocal = profile?.email?.split('@')[0]
    if (emailLocal && emailLocal.trim().length > 0) return emailLocal
    return userId
  })()

  const { data: bets } = await supabase
    .from('bets')
    .select('category_id, nominee_id')
    .eq('user_id', userId)

  // winners por categoria
  const { data: winners } = await supabase
    .from('nominees')
    .select('id, category_id, name, tmdb_data')
    .eq('is_winner', true)

  const winnerByCategory = new Map((winners ?? []).map(w => [w.category_id, w]))

  // nominees por categoria para mostrar nome caso não seja vencedor
  const { data: nominees } = await supabase
    .from('nominees')
    .select('id, category_id, name')
  const nomineeById = new Map((nominees ?? []).map(n => [n.id, n]))

  // categories para nome da categoria
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')

  const categoryName = new Map((categories ?? []).map(c => [c.id, c.name]))

  const items = (bets ?? []).map(b => {
    const catName = categoryName.get(b.category_id) ?? b.category_id
    const winner = winnerByCategory.get(b.category_id)
    const chosen = nomineeById.get(b.nominee_id)
    const hit = winner?.id === b.nominee_id
    return {
      category_id: b.category_id,
      category_name: catName,
      chosen_name: chosen?.name ?? b.nominee_id,
      winner_name: winner?.name ?? null,
      hit
    }
  })

  const total = categories?.length ?? 0
  const score = items.reduce((acc, i) => acc + (i.hit ? 1 : 0), 0)

  return (
    <div className="space-y-6">
      <div className="border-b pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <p className="text-sm text-gray-600">
            Pontuação: {score}/{total}
          </p>
        </div>
        <Link href="/ranking" className="text-xs text-indigo-600 hover:underline">Voltar ao Ranking</Link>
      </div>

      <ul className="divide-y">
        {items.map(i => (
          <li key={`${i.category_id}-${i.chosen_name}`} className="py-3">
            <div className="font-medium">{i.category_name}</div>
            <div className="text-sm">
              Sua aposta: <span className="font-semibold">{i.chosen_name}</span>
              {' '}| Vencedor: <span className="font-semibold">{i.winner_name ?? '—'}</span>
            </div>
            <div className="text-sm mt-1">
              {i.hit ? (
                <span className="text-green-700">Acertou</span>
              ) : (
                <span className="text-red-700">Errou</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}