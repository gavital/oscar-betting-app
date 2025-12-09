import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'

type UserScore = {
  user_id: string
  name: string | null
  score: number
}

type SearchParams = {
  q?: string
  sort?: 'score_desc' | 'score_asc' | 'name_asc'
  page?: string
  perPage?: string
}

export default async function RankingPage({
  searchParams,
}: {
  // ✅ Next.js 16 entrega searchParams como Promise; devemos aguardá-lo
  searchParams?: Promise<SearchParams>
}) {
  const supabase = await createServerSupabaseClient()

  // ✅ Desembrulhar os searchParams corretamente
  const sp = (await searchParams) ?? {}

  // Estado de publicação dos resultados
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

  // Tenta carregar todos os perfis (RLS pode podar resultados)
  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('id, name')

  // Mapa id -> name (pode ficar incompleto devido a RLS)
  const nameByUser = new Map<string, string | null>()
  if (!profilesErr && Array.isArray(profiles)) {
    for (const p of profiles) {
      const nm = typeof p.name === 'string' ? p.name.trim() : null
      nameByUser.set(p.id, nm && nm.length > 0 ? nm : null)
    }
  }

  // Usuário atual (para destaque e correção pontual do nome)
  const { data: { user } } = await supabase.auth.getUser()

  // Se o RLS podou o profile do usuário atual na consulta "all",
  // busca pontualmente o próprio profile para garantir o nome dele.
  if (user && (!nameByUser.has(user.id) || !nameByUser.get(user.id))) {
    const { data: selfProfile } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('id', user.id)
      .maybeSingle()
    if (selfProfile) {
      const nm = typeof selfProfile.name === 'string' ? selfProfile.name.trim() : null
      nameByUser.set(selfProfile.id, nm && nm.length > 0 ? nm : null)
    }
  }

  // Agregar contagens de acertos (bets que acertaram winners)
  const counts = new Map<string, number>()
  for (const b of bets ?? []) {
    if (b.user_id && winnerIds.has(b.nominee_id!)) {
      counts.set(b.user_id, (counts.get(b.user_id) ?? 0) + 1)
    }
  }

  let list: UserScore[] = Array.from(counts.entries()).map(([user_id, score]) => ({
    user_id,
    // Armazena também o fallback para que busca por nome funcione melhor
    name: nameByUser.get(user_id) ?? null,
    score
  }))

  // Ordenação
  const sort = sp.sort ?? 'score_desc'
  list = list.sort((a, b) => {
    const an = a.name ?? a.user_id
    const bn = b.name ?? b.user_id
    switch (sort) {
      case 'score_asc':
        return a.score - b.score || an.localeCompare(bn)
      case 'name_asc':
        return an.localeCompare(bn) || b.score - a.score
      case 'score_desc':
      default:
        return b.score - a.score || an.localeCompare(bn)
    }
  })

  // Filtro (q: busca por nome)
  const q = (sp.q ?? '').toLowerCase().trim()
  if (q) {
    list = list.filter(u =>
      (u.name ?? '').toLowerCase().includes(q)
    )
  }

  const podium = list.slice(0, 3)
  const totalParticipants = list.length

  // Paginação
  const perPage = Math.max(5, Math.min(50, Number(sp.perPage ?? '20')))
  const page = Math.max(1, Number(sp.page ?? '1'))
  const totalPages = Math.max(1, Math.ceil(totalParticipants / perPage))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * perPage
  const end = start + perPage
  const visible = list.slice(start, end)

  // Helper de nome
  const getDisplayName = (userId: string, name: string | null) => {
    const n = (name ?? '').trim()
    return n && n.length > 0 ? n : userId
  }

  // Helpers de query string preservando filtros e ordenação
  const qs = (params: Partial<SearchParams>) => {
    const merged = { q: sp.q, sort: sort, perPage: String(perPage), page: String(safePage), ...params }
    const entries = Object.entries(merged).filter(([, v]) => v && String(v).length > 0)
    const query = new URLSearchParams(entries as any).toString()
    return query ? `?${query}` : ''
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho e filtros */}
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

        {/* Filtros de busca e ordenação */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <form action="/ranking" className="sm:col-span-2 flex gap-2">
            <input
              name="q"
              defaultValue={sp.q ?? ''}
              placeholder="Buscar por nome"
              className="flex-1 border rounded px-3 py-2 text-sm"
              aria-label="Buscar participantes"
            />
            <input type="hidden" name="sort" value={sort} />
            <input type="hidden" name="perPage" value={perPage} />
            <button type="submit" className="border rounded px-3 py-2 text-sm bg-white hover:bg-gray-50">
              Buscar
            </button>
          </form>

          <div className="flex gap-2">
            <Link href={`/ranking${qs({ sort: 'score_desc', page: '1' })}`} aria-label="Ordenar por maior pontuação">
              <button className={`border rounded px-3 py-2 text-sm ${sort === 'score_desc' ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'}`}>Score ↓</button>
            </Link>
            <Link href={`/ranking${qs({ sort: 'score_asc', page: '1' })}`} aria-label="Ordenar por menor pontuação">
              <button className={`border rounded px-3 py-2 text-sm ${sort === 'score_asc' ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'}`}>Score ↑</button>
            </Link>
            <Link href={`/ranking${qs({ sort: 'name_asc', page: '1' })}`} aria-label="Ordenar por nome A-Z">
              <button className={`border rounded px-3 py-2 text-sm ${sort === 'name_asc' ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'}`}>Nome A–Z</button>
            </Link>
          </div>
        </div>

        {/* Métricas rápidas */}
        <div className="mt-3 text-xs text-gray-600">
          Participantes: {totalParticipants} • Página {safePage}/{totalPages}
        </div>
      </div>

      {/* Pódio */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {podium.map((p, idx) => (
          <div key={p.user_id} className="border rounded p-4">
            <div className="text-sm text-gray-500">{idx + 1}º lugar</div>
            <div className="text-lg font-semibold flex items-center gap-2">
              {idx === 0 && <span aria-hidden="true">🥇</span>}
              {idx === 1 && <span aria-hidden="true">🥈</span>}
              {idx === 2 && <span aria-hidden="true">🥉</span>}
              <span>{getDisplayName(p.user_id, p.name)}</span>
            </div>
            <div className="text-sm text-gray-700">Pontuação: {p.score}/{total}</div>
            <Link href={`/ranking/${p.user_id}`} className="text-xs text-indigo-600 hover:underline">Ver Apostas</Link>
          </div>
        ))}
        {podium.length === 0 && (
          <div className="text-sm text-gray-500">Sem dados para o pódio ainda.</div>
        )}
      </div>

      {/* Lista completa com paginação */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold">Participantes</h2>

        {visible.length === 0 ? (
          <div className="p-4 border rounded bg-gray-50 text-gray-700 text-sm">
            Nenhum participante encontrado para o filtro aplicado.
          </div>
        ) : (
        <ul className="divide-y">
            {visible.map((u, idx) => {
              const rank = start + idx + 1
              const isYou = user?.id === u.user_id
              const pct = total > 0 ? Math.round((u.score / total) * 100) : 0
              const displayName = getDisplayName(u.user_id, u.name)

              return (
            <li key={u.user_id} className="flex items-center justify-between py-2">
                  <div className="max-w-[70%]">
                    <div className="flex items-center gap-2">
                      <span className="mr-2 text-sm text-gray-500">#{rank}</span>
                      <span className={`font-medium ${isYou ? 'text-purple-700' : ''}`}>
                        {displayName} {isYou && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Você</span>}
                      </span>
                <span className="ml-2 text-sm text-gray-700">{u.score}/{total}</span>
                    </div>
                    {/* Barra de progresso do usuário */}
                    <div
                      className="mt-1 w-full bg-gray-200 h-2 rounded"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Progresso de acertos de ${displayName}: ${u.score}/${total} (${pct}%)`}
                    >
                      <div className="bg-blue-600 h-2 rounded" style={{ width: `${pct}%` }} />
                    </div>
              </div>
              <Link href={`/ranking/${u.user_id}`} className="text-xs text-indigo-600 hover:underline">Ver Apostas</Link>
            </li>
              )
            })}
        </ul>
        )}

        {/* Paginação */}
        <div className="flex items-center justify-between pt-3">
          <Link
            href={`/ranking${qs({ page: String(Math.max(1, safePage - 1)) })}`}
            aria-label="Página anterior"
            aria-disabled={safePage <= 1}
            className={`text-sm px-3 py-2 border rounded ${safePage <= 1 ? 'pointer-events-none opacity-50' : 'bg-white hover:bg-gray-50'}`}
          >
            ← Anterior
          </Link>
          <div className="text-xs text-gray-600">Página {safePage} de {totalPages}</div>
          <Link
            href={`/ranking${qs({ page: String(Math.min(totalPages, safePage + 1)) })}`}
            aria-label="Próxima página"
            aria-disabled={safePage >= totalPages}
            className={`text-sm px-3 py-2 border rounded ${safePage >= totalPages ? 'pointer-events-none opacity-50' : 'bg-white hover:bg-gray-50'}`}
          >
            Próxima →
          </Link>
        </div>
      </div>
    </div>
  )
}