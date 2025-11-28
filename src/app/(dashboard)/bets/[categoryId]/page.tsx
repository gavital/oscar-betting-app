import { createServerSupabaseClient } from '@/lib/supabase/server'
import { confirmBet } from '../actions'
import { Button } from '@/components/ui/button'

export default async function BetCategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>
}) {
  const { categoryId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <p className="text-sm text-red-600">Faça login</p>

  const [{ data: category }, { data: nominees }, { data: currentBet }] = await Promise.all([
    supabase.from('categories').select('id, name').eq('id', categoryId).single(),
    supabase.from('nominees').select('id, name, imdb_data').eq('category_id', categoryId).order('name'),
    supabase.from('bets').select('nominee_id').eq('user_id', user.id).eq('category_id', categoryId).maybeSingle()
  ])

  const selected = currentBet?.nominee_id

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">{category?.name}</h2>

      <form action={confirmBet} method="post" className="space-y-4">
        <input type="hidden" name="category_id" value={categoryId} />
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {nominees?.map(n => (
            <li key={n.id} className={`border rounded p-3 ${selected === n.id ? 'ring-2 ring-purple-500' : ''}`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="nominee_id"
                  value={n.id}
                  defaultChecked={selected === n.id}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">{n.name}</div>
                  {n.imdb_data?.poster && (
                    <img src={n.imdb_data.poster} alt={n.name} className="mt-2 h-28 w-auto rounded" />
                  )}
                  {n.imdb_data?.plot && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-3">{n.imdb_data.plot}</p>
                  )}
                </div>
              </label>
            </li>
          ))}
        </ul>
        <Button type="submit">Confirmar Aposta</Button>
      </form>
    </div>
  )
}