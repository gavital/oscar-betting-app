import { createServerSupabaseClient } from '@/lib/supabase/server'
import { importNominees, createNominee, updateNominee, deleteNominee, enrichNomineeWithTMDB } from '../actions'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDeleteNomineeForm } from '../_components/ConfirmDeleteNomineeForm'
import Image from 'next/image'
import { getTmdbImageUrl } from '@/lib/tmdb/client'
import WinnerSetForm from '../_components/WinnerSetForm'

export default async function ManageNomineesPage({
  params,
}: {
  params: Promise<{ categoryId: string }>
}) {
  const { categoryId } = await params
  const supabase = await createServerSupabaseClient()

  const { data: category, error: catErr } = await supabase
    .from('categories')
    .select('id, name, max_nominees, is_active')
    .eq('id', categoryId)
    .single()

  const { data: nominees, error: nomErr } = await supabase
    .from('nominees')
    .select('id, name, tmdb_id, tmdb_data, imdb_id, imdb_data, is_winner')
    .eq('category_id', categoryId)
    .order('name')


  if (catErr || !category) {
    return <p className="text-red-600 text-sm">Erro ao carregar categoria: {catErr?.message ?? 'Não encontrada'}</p>
  }

  const count = nominees?.length ?? 0

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{category?.name}</h2>
          <p className="text-sm text-muted-foreground">{count} / {category?.max_nominees} indicados</p>
        </div>
        <Link href="/admin/nominees">
          <Button variant="outline">Voltar</Button>
        </Link>
      </div>

      {/* Aba: Entrada Rápida */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Entrada Rápida</h3>
        <form action={importNominees} className="space-y-3">
          <input type="hidden" name="category_id" value={categoryId} />
          <Label htmlFor="bulk_text">Cole a lista de indicados (um por linha)</Label>
          <textarea
            id="bulk_text"
            name="bulk_text"
            className="w-full border rounded p-2 h-40 bg-card text-foreground"
            placeholder="Ex:\nFilme A\nFilme B\nFilme C"
          />
          <div className="text-sm text-foreground/70">
            Duplicatas serão removidas automaticamente. Linhas em branco são ignoradas.
          </div>

          {/* Checkbox para substituir todos existentes (modal de confirmação sugerida no client) */}
          <div className="flex items-center gap-2">
            <input id="replace" type="checkbox" name="replace" defaultChecked />
            <Label htmlFor="replace" className="text-sm">Substituir os indicados existentes</Label>
          </div>

          <Button type="submit">Importar Indicados</Button>
        </form>
      </section>

      {/* Aba: Entrada Individual */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Entrada Individual</h3>

        <form action={createNominee} className="flex gap-2">
          <input type="hidden" name="category_id" value={categoryId} />
          <Input name="name" placeholder="Nome do indicado" required minLength={2} />
          <Button type="submit">Adicionar</Button>
        </form>

        <ul className="divide-y">
          {nominees?.map((n) => {
            // Tenta usar poster_path (filmes); se não houver, tenta profile_path (pessoas)
            const posterPath =
              (n as any)?.tmdb_data?.poster_path ??
              (n as any)?.tmdb_data?.profile_path ??
              null;

            const posterUrl = getTmdbImageUrl(posterPath, 'list');

            return (
              <li key={n.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  {/* Thumbnail TMDB */}
                  {posterUrl ? (
                    <Image
                      src={posterUrl}
                      alt={n.name}
                      width={92}   // ~ metade de w185 mantém nitidez e layout discreto
                      height={138} // proporção 2:3
                      className="rounded border bg-card object-cover"
                    />
                  ) : (
                    <div className="w-[92px] h-[138px] rounded border bg-card grid place-items-center text-[11px] text-foreground/70">
                      Sem imagem
                    </div>
                  )}

                  <div className="flex flex-col">
                    <span className="font-medium">{n.name}</span>

                    {/* Exemplo: mostrar ano do filme se existir */}
                    {(n as any)?.tmdb_data?.release_date && (
                      <span className="text-xs text-foreground/70">
                        {new Date((n as any).tmdb_data.release_date).getFullYear()}
                      </span>
                    )}

                    {/* Badge de status TMDB */}
                    {n.tmdb_data ? (
                      <span className="mt-1 w-fit text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                        TMDB OK
                      </span>
                    ) : (
                      <span className="mt-1 w-fit text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                        TMDB Pendente
                      </span>
                    )}

                    {/* Vencedor */}
                    {n.is_winner && (
                      <span className="mt-1 w-fit text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">
                        Vencedor
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <form action={enrichNomineeWithTMDB} className="flex items-center gap-2">
                    <input type="hidden" name="nominee_id" value={n.id} />
                    <input type="hidden" name="category_id" value={categoryId} />
                    <input type="hidden" name="type" value="movie" />
                    <Input name="name" placeholder="Título do filme" defaultValue={n.name} className="text-sm w-56" />
                    <Button variant="outline" className="text-sm">Buscar TMDB</Button>
                  </form>

                  <form action={updateNominee} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={n.id} />
                    <Input name="name" defaultValue={n.name} className="text-sm w-56" />
                    <Button variant="outline" className="text-sm">Salvar</Button>
                  </form>

                  <ConfirmDeleteNomineeForm id={n.id} />

                  {/* Marcar como vencedor (apenas admin) */}
                  <WinnerSetForm
                    categoryId={categoryId}
                    nomineeId={n.id}
                    disabled={!!n.is_winner}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}