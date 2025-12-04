import Image from 'next/image'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { confirmBet } from '../actions'
import { getTmdbImageUrl } from '@/lib/tmdb/client'

export default async function BetCategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>
}) {
  const { categoryId } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Categoria ativa
  const { data: category, error: catErr } = await supabase
    .from('categories')
    .select('id, name, is_active')
    .eq('id', categoryId)
    .single()

  if (catErr || !category) {
    return <div className="text-sm text-red-600">Categoria não encontrada</div>
  }

  // Apostas abertas?
  const { data: settings } = await supabase
    .from('app_settings')
    .select('key, value')
    .eq('key', 'bets_open')
    .maybeSingle()
  const betsOpen = settings?.value === true || settings?.value === 'true' || settings?.value?.toString?.() === 'true'

  // Nominees da categoria
  const { data: nominees, error: nomErr } = await supabase
    .from('nominees')
    .select('id, name, tmdb_data')
    .eq('category_id', categoryId)
    .order('name')

  if (nomErr) {
    return <div className="text-sm text-red-600">Erro ao carregar indicados: {nomErr.message}</div>
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
          const posterPath = (n as any)?.tmdb_data?.poster_path ?? (n as any)?.tmdb_data?.profile_path ?? null
          const posterUrl = getTmdbImageUrl(posterPath, 'list')
          const isSelected = selectedNomineeId === n.id

          return (
            <li key={n.id} className="border rounded p-3 flex flex-col gap-3">
              {posterUrl ? (
                <Image src={posterUrl} alt={n.name} width={185} height={278} className="rounded border object-cover" />
              ) : (
                <div className="w-[185px] h-[278px] rounded border bg-gray-50 grid place-items-center text-[12px] text-gray-500">
                  Sem imagem
                </div>
              )}

              <div className="flex-1">
                <div className="font-medium">{n.name}</div>
                {isSelected && <div className="text-xs text-green-700 mt-1">Sua aposta atual</div>}
              </div>

              <form action={confirmBet} className="mt-auto">
                <input type="hidden" name="category_id" value={categoryId} />
                <input type="hidden" name="nominee_id" value={n.id} />
                <Button type="submit" disabled={!betsOpen} variant={isSelected ? 'outline' : 'default'}>
                  {betsOpen ? (isSelected ? 'Atualizar Aposta' : 'Confirmar Aposta') : 'Encerrado'}
                </Button>
              </form>
            </li>
          )
        })}
      </ul>
    </div>
  )
}