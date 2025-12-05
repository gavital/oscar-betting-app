import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'

type UserScore = {
  user_id: string
  name: string | null
  email: string | null
  score: number
}

export default async function RankingPage() {
  const supabase = await createServerSupabaseClient()

  // Estado de publicação
  const { data: publishedSetting } = await supabase
    .from('app_settings')
    .select('key, value')
    .eq('key', 'results_published')
    .maybeSingle()

  const resultsPublished =
    publishedSetting?.value === true ||
    publishedSetting?.value === 'true' ||
    publishedSetting?.value?.toString?.() === 'true' ||
    false

  // Total de categorias ativas para mostrar "acertos/total"
  const { data: categories } = await supabase
    .from('categories')
    .select('id')
    .eq('is_active', true)
  const total = categories?.length ?? 0

  if (!resultsPublished) {
    return (
      <div className="space-y-6">
        <div className="border-b pb-4">
          <h1 className="text-2xl font-bold">Ranking</h1>
          <p className="text-sm text-gray-600">
            Resultados ainda não publicados.
          </p>
        </div>

        <div className="p-4 border rounded bg-yellow-50 text-yellow-800 text-sm">
          O ranking ficará disponível após a publicação dos resultados oficiais. Enquanto isso, você pode continuar fazendo suas apostas.
        </div>

        <Link href="/bets" className="inline-block text-sm text-indigo-600 hover:underline">
          Ir para Minhas Apostas
        </Link>
      </div>
    )
  }

  // winners e bets publicados
  // Aggregate: contar bets onde nominee.is_winner = true, por usuário
  // Nota: Supabase pode não suportar join direto sem RPC; vamos fazer 2 leituras e agregar em memória
  const { data: winners } = await supabase
    .from('nominees')
    .select('id, category_id')
    .eq('is_winner', true)

  const winnerIds = new Set((winners ?? []).map(w => w.id))

  const { data: bets } = await supabase
    .from('bets')
    .select('user_id, nominee_id')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name')

  const nameByUser = new Map((profiles ?? []).map(p => [p.id, p.name ?? null]))

  const counts = new Map<string, number>()
  for (const b of bets ?? []) {
    if (winnerIds.has(b.nominee_id)) {
      counts.set(b.user_id, (counts.get(b.user_id) ?? 0) + 1)
    }
  }

  const list: UserScore[] = Array.from(counts.entries()).map(([user_id, score]) => ({
    user_id,
    name: nameByUser.get(user_id) ?? null,
    email: null,
    score
  })).sort((a, b) => b.score - a.score)

  const podium = list.slice(0, 3)

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">Ranking</h1>
        <p className="text-sm text-gray-600">
          Total de categorias consideradas: {total}
        </p>
        <div className="mt-2">
          <span className="inline-flex items-center text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
            RESULTADOS PUBLICADOS
          </span>
        </div>
      </div>

      {/* Pódio */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {podium.map((p, idx) => (
          <div key={p.user_id} className="border rounded p-4">
            <div className="text-sm text-gray-500">{idx + 1}º lugar</div>
            <div className="text-lg font-semibold">{p.name ?? p.user_id}</div>
            <div className="text-sm text-gray-700">Pontuação: {p.score}/{total}</div>
            <Link href={`/ranking/${p.user_id}`} className="text-xs text-indigo-600 hover:underline">Ver Apostas</Link>
          </div>
        ))}
        {podium.length === 0 && (
          <div className="text-sm text-gray-500">Sem dados para o pódio ainda.</div>
        )}
      </div>

      {/* Lista completa */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold">Participantes</h2>
        <ul className="divide-y">
          {list.map((u, idx) => (
            <li key={u.user_id} className="flex items-center justify-between py-2">
              <div>
                <span className="mr-2 text-sm text-gray-500">#{idx + 1}</span>
                <span className="font-medium">{u.name ?? u.user_id}</span>
                <span className="ml-2 text-sm text-gray-700">{u.score}/{total}</span>
              </div>
              <Link href={`/ranking/${u.user_id}`} className="text-xs text-indigo-600 hover:underline">Ver Apostas</Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}