// src/app/(dashboard)/admin/nominees/[categoryId]/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { importNominees, createNominee, updateNominee, deleteNominee, enrichNomineeWithOmdb } from './actions'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function ManageNomineesPage({ params }: { params: { categoryId: string } }) {
  const supabase = await createServerSupabaseClient()
  const categoryId = params.categoryId

  const { data: category, error: catErr } = await supabase
    .from('categories')
    .select('id, name, max_nominees, is_active')
    .eq('id', categoryId)
    .single()

  const { data: nominees, error: nomErr } = await supabase
    .from('nominees')
    .select('id, name, imdb_id, imdb_data, is_winner')
    .eq('category_id', categoryId)
    .order('name')

  if (catErr) {
    return <p className="text-red-600 text-sm">Erro ao carregar categoria: {catErr.message}</p>
  }

  const count = nominees?.length ?? 0

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{category?.name}</h2>
          <p className="text-sm text-gray-600">{count} / {category?.max_nominees} indicados</p>
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
            className="w-full border rounded p-2 h-40"
            placeholder="Ex:\nFilme A\nFilme B\nFilme C"
          />
          <div className="text-sm text-gray-500">
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
          {nominees?.map(n => (
            <li key={n.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="font-medium">{n.name}</span>
                {n.imdb_data ? (
                  <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">IMDB OK</span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">IMDB Pendente</span>
                )}
                {n.is_winner && (
                  <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">Vencedor</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <form action={enrichNomineeWithOmdb}>
                  <input type="hidden" name="id" value={n.id} />
                  <Button variant="outline" className="text-sm">Buscar IMDB</Button>
                </form>

                <form action={updateNominee} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={n.id} />
                  <Input name="name" defaultValue={n.name} className="text-sm w-56" />
                  <Button variant="outline" className="text-sm">Salvar</Button>
                </form>

                <form
                  action={deleteNominee}
                  onSubmit={(e) => { if (!confirm('Confirmar remoção do indicado?')) e.preventDefault() }}
                >
                  <input type="hidden" name="id" value={n.id} />
                  <Button variant="destructive" className="text-sm">Excluir</Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}