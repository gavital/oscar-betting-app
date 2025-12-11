import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import BetConfirmForm from '@/app/(dashboard)/bets/_components/BetConfirmForm'
import { getTmdbImageUrl } from '@/lib/tmdb/client'

export default async function BetCategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>
}) {
  const { categoryId } = await params
  const supabase = await createServerSupabaseClient()

  // Usuário autenticado?
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Categoria ativa
  const { data: category, error: catErr } = await supabase
    .from('categories')
    .select('id, name, is_active')
    .eq('id', categoryId)
    .single()

  if (catErr || !category) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-red-600">Categoria não encontrada.</div>
        <Link href="/bets">
          <Button variant="outline">Voltar</Button>
        </Link>
      </div>
    )
  }

  // Status de apostas (app_settings.bets_open) - fallback: aberto
  const { data: setting } = await supabase
    .from('app_settings')
    .select('key, value')
    .eq('key', 'bets_open')
    .maybeSingle()

  const betsOpen =
    setting?.value === true ||
    setting?.value === 'true' ||
    setting?.value?.toString?.() === 'true' ||
    setting?.value == null // fallback: aberto quando ausente

  // Nominees da categoria
  const { data: nominees, error: nomErr } = await supabase
    .from('nominees')
    .select('id, name, meta, tmdb_data')
    .eq('category_id', categoryId)
    .order('name')

  if (nomErr) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-red-600">Erro ao carregar indicados: {nomErr.message}</div>
        <Link href="/bets">
          <Button variant="outline">Voltar</Button>
        </Link>
      </div>
    )
  }

  // Aposta existente do usuário nesta categoria
  const { data: myBet } = await supabase
    .from('bets')
    .select('nominee_id')
    .eq('user_id', user.id)
    .eq('category_id', categoryId)
    .maybeSingle()

  const selectedNomineeId = myBet?.nominee_id ?? null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{category.name}</h2>
          {betsOpen ? (
            <p className="text-sm text-green-700">Apostas abertas</p>
          ) : (
            <p className="text-sm text-red-600">Apostas encerradas</p>
          )}
        </div>

        <Link href="/bets">
          <Button variant="outline">Voltar</Button>
        </Link>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(nominees ?? []).map(n => {
          const posterPath =
            (n as any)?.tmdb_data?.poster_path ??
            (n as any)?.tmdb_data?.profile_path ??
            null
          const posterUrl = getTmdbImageUrl(posterPath, 'list')
          const isSelected = selectedNomineeId === n.id

          return (
            <li key={n.id} className="border rounded p-3 flex flex-col gap-3">
              {/* Imagem do TMDB */}
              {posterUrl ? (
                <Image
                  src={posterUrl}
                  alt={n.name}
                  width={185}
                  height={278}
                  className="rounded border object-cover bg-card"
                />
              ) : (
                <div className="w-[185px] h-[278px] rounded border bg-card grid place-items-center text-[12px] text-foreground/70">
                  Sem imagem
                </div>
              )}

              <div className="flex-1">
                <div className="font-medium">{n.name}</div>
                {(n as any)?.meta?.film_title && (
                  <div className="text-xs text-foreground/70">
                    Filme: {(n as any).meta.film_title}
                  </div>
                )}
                {isSelected && (
                  <div className="text-xs text-green-700 mt-1">Sua aposta atual</div>
                )}
              </div>

              {/* Integração do componente cliente que chama a Server Action e mostra toasts */}
              <BetConfirmForm
                categoryId={categoryId}
                nomineeId={n.id}
                isSelected={isSelected}
                betsOpen={!!betsOpen}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}