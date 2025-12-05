import Link from 'next/link'
import Image from 'next/image'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getTmdbImageUrl } from '@/lib/tmdb/client'

export default async function HomePage() {
    const supabase = await createServerSupabaseClient()

    // Status global: bets_open
    const { data: betsOpenSetting } = await supabase
        .from('app_settings')
        .select('key, value')
        .eq('key', 'bets_open')
        .maybeSingle()
    const betsOpen =
        betsOpenSetting?.value === true ||
        betsOpenSetting?.value === 'true' ||
        betsOpenSetting?.value?.toString?.() === 'true' ||
        betsOpenSetting == null

    // Status global: results_published
    const { data: resultsSetting } = await supabase
        .from('app_settings')
        .select('key, value')
        .eq('key', 'results_published')
        .maybeSingle()
    const resultsPublished =
        resultsSetting?.value === true ||
        resultsSetting?.value === 'true' ||
        resultsSetting?.value?.toString?.() === 'true' ||
        false

    // Estatísticas
    const { data: profiles } = await supabase.from('profiles').select('id')
    const { data: bets } = await supabase.from('bets').select('id')
    const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)

    const totalUsers = profiles?.length ?? 0
    const totalBets = bets?.length ?? 0
    const totalActiveCategories = categories?.length ?? 0

    // Pódio (simplificado): quando publicados
    let podium: Array<{ user_id: string; name: string | null; score: number }> = []
    if (resultsPublished) {
        const { data: winners } = await supabase
            .from('nominees')
            .select('id')
            .eq('is_winner', true)
        const winnerIds = new Set((winners ?? []).map(w => w.id))

        const { data: betsFull } = await supabase
            .from('bets')
            .select('user_id, nominee_id')
        const { data: profs } = await supabase
            .from('profiles')
            .select('id, name')
            
        const nameByUser = new Map((profs ?? []).map(p => [p.id, p.name ?? null]))
        const counts = new Map<string, number>()
        for (const b of betsFull ?? []) {
            if (winnerIds.has(b.nominee_id)) {
                counts.set(b.user_id, (counts.get(b.user_id) ?? 0) + 1)
            }
        }
        podium = Array.from(counts.entries())
            .map(([user_id, score]) => ({ user_id, name: nameByUser.get(user_id) ?? null, score }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
    }

    // Banner com imagens TMDB:
    // - Se publicados: vencedores com poster_path
    // - Senão: nominees de alguma categoria ativa com poster_path (limitado)
    let bannerItems: Array<{ name: string; posterUrl: string }> = []

    if (resultsPublished) {
        const { data: winners } = await supabase
            .from('nominees')
            .select('name, tmdb_data')
            .eq('is_winner', true)

        bannerItems = (winners ?? [])
            .map(w => {
                const path = (w as any)?.tmdb_data?.poster_path ?? (w as any)?.tmdb_data?.profile_path
                const url = getTmdbImageUrl(path, 'detail')
                return url ? { name: w.name, posterUrl: url } : null
            })
            .filter((x): x is { name: string; posterUrl: string } => x !== null)
            .slice(0, 5)

    } else {
        const { data: nominees } = await supabase
            .from('nominees')
            .select('name, tmdb_data')
            .limit(12)

        bannerItems = (nominees ?? [])
            .map(n => {
                const path = (n as any)?.tmdb_data?.poster_path ?? (n as any)?.tmdb_data?.profile_path
                const url = getTmdbImageUrl(path, 'detail')
                return url ? { name: n.name, posterUrl: url } : null
            })
            .filter((x): x is { name: string; posterUrl: string } => x !== null)
            .slice(0, 5)
    }

    return (
        <div className="space-y-8">
            {/* Header/Status */}
            <div className="space-y-2">
                <h1 className="text-2xl font-bold">Bem-vindo(a) ao Oscar Betting App</h1>
                <div className="flex items-center gap-2">
                    {betsOpen ? (
                        <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            APOSTAS ABERTAS
                        </span>
                    ) : (
                        <span className="inline-flex items-center text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                            APOSTAS FECHADAS
                        </span>
                    )}
                    {resultsPublished ? (
                        <span className="inline-flex items-center text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                            RESULTADOS PUBLICADOS
                        </span>
                    ) : (
                        <span className="inline-flex items-center text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            RESULTADOS OCULTOS
                        </span>
                    )}
                </div>
            </div>

            {/* Banner visual */}
            {bannerItems.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {bannerItems.map((b, idx) => (
                        <div key={`${b.name}-${idx}`} className="relative">
                            <Image
                                src={b.posterUrl}
                                alt={b.name}
                                width={300}
                                height={450}
                                className="rounded border object-cover"
                                priority={idx === 0}
                            />
                            <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                {b.name}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Estatísticas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border rounded p-4">
                    <div className="text-sm text-gray-500">Participantes</div>
                    <div className="text-2xl font-semibold">{totalUsers}</div>
                </div>
                <div className="border rounded p-4">
                    <div className="text-sm text-gray-500">Apostas Registradas</div>
                    <div className="text-2xl font-semibold">{totalBets}</div>
                </div>
                <div className="border rounded p-4">
                    <div className="text-sm text-gray-500">Categorias Ativas</div>
                    <div className="text-2xl font-semibold">{totalActiveCategories}</div>
                </div>
            </div>

            {/* Pódio simplificado (quando publicado) */}
            {resultsPublished && (
                <div className="space-y-2">
                    <h2 className="text-lg font-bold">Pódio Atual</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {podium.map((p, idx) => (
                            <div key={p.user_id} className="border rounded p-4">
                                <div className="text-sm text-gray-500">{idx + 1}º lugar</div>
                                <div className="text-lg font-semibold">{p.name ?? p.user_id}</div>
                                <Link href={`/ranking/${p.user_id}`} className="text-xs text-indigo-600 hover:underline">
                                    Ver Apostas
                                </Link>
                            </div>
                        ))}
                        {podium.length === 0 && (
                            <div className="text-sm text-gray-500">Sem dados para o pódio ainda.</div>
                        )}
                    </div>
                </div>
            )}

            {/* Ações rápidas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link href="/bets" className="border rounded p-4 hover:bg-gray-50">
                    <div className="text-lg font-semibold">Minhas Apostas</div>
                    <div className="text-sm text-gray-600">Faça ou edite suas apostas</div>
                </Link>
                <Link href="/ranking" className="border rounded p-4 hover:bg-gray-50">
                    <div className="text-lg font-semibold">Ver Ranking</div>
                    <div className="text-sm text-gray-600">Veja o pódio e pontuação</div>
                </Link>
                <Link href="/admin/settings" className="border rounded p-4 hover:bg-gray-50">
                    <div className="text-lg font-semibold">Controle de Apostas</div>
                    <div className="text-sm text-gray-600">Admin: abrir/fechar apostas e publicar resultados</div>
                </Link>
            </div>
        </div>
    )
}