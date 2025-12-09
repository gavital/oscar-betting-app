// src/app/(dashboard)/bets/page.tsx
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default async function MyBetsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Estado global das apostas
  const { data: setting } = await supabase
    .from('app_settings')
    .select('key, value')
    .eq('key', 'bets_open')
    .maybeSingle()
  const betsOpen =
    setting?.value === true ||
    setting?.value === 'true' ||
    setting?.value?.toString?.() === 'true' ||
    setting == null // fallback aberto

    // results_published
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

    if (betsErr) {
      return <div className="text-sm text-red-600">Erro ao carregar suas apostas: {betsErr.message}</div>
    }  

  const betByCategory = new Map((bets ?? []).map(b => [b.category_id, b.nominee_id]))
  const total = categories?.length ?? 0
  const completed = (categories ?? []).reduce((acc, cat) => acc + (betByCategory.has(cat.id) ? 1 : 0), 0)
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">Minhas Apostas</h1>
        <p className="text-sm text-muted-foreground">
          Progresso: {completed} de {total} categorias ({progressPct}%)
        </p>
        {/* Status global de apostas */}
        <div className="mt-2 flex items-center gap-2">
          {betsOpen ? (
            <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
              APOSTAS ABERTAS
            </span>
          ) : (
            <span className="inline-flex items-center text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
              APOSTAS FECHADAS
            </span>
          )}
          {resultsPublished && (
            <span className="inline-flex items-center text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
              RESULTADOS PUBLICADOS
            </span>
          )}
        </div>
        {/* Progress bar acessível */}
        <div
          className="w-full bg-muted h-2 rounded mt-2"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progresso de apostas: ${completed} de ${total} (${progressPct}%)`}
        >
          <div className="bg-blue-600 h-2 rounded" style={{ width: `${progressPct}%` }} />
        </div>
        {!betsOpen && (
          <p className="mt-2 text-xs text-muted-foreground">
            As apostas estão fechadas no momento. Você poderá visualizar suas escolhas, mas não editar.
          </p>
        )}
      </div>

      <ul className="divide-y">
        {(categories ?? []).map(cat => {
          const done = betByCategory.has(cat.id)
          const canNavigate = betsOpen
          const button = (
            <Button
              variant={done ? 'outline' : 'default'}
              disabled={!canNavigate}
              aria-disabled={!canNavigate}
              title={!canNavigate ? 'Apostas estão fechadas' : undefined}
            >
              {done ? 'Editar aposta' : 'Fazer aposta'}
            </Button>
          )

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
            {canNavigate ? (
              <Link href={`/bets/${cat.id}`}>{button}</Link>
            ) : (
              <div>{button}</div>
            )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}