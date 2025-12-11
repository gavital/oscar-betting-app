// src/app/(dashboard)/admin/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CategoryCard } from './categories/category-card'
import SettingsBetsForm from './settings/_components/SettingsBetsForm'
import SettingsResultsForm from './settings/_components/SettingsResultsForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ConfirmDeleteNomineeDialog from './nominees/_components/ConfirmDeleteNomineeDialog'
import WinnerSetForm from './nominees/_components/WinnerSetForm'
import { importNominees, createNominee, updateNominee, enrichNomineeWithTMDB } from './nominees/actions'
import { getTmdbImageUrl } from '@/lib/tmdb/client'
import { ImportAllFromGlobalButton } from './settings/_components/ImportAllFromGlobalButton';

// import { setCeremonyYear } from './settings/actions'

import { SettingsScrapeSourcesForm } from './settings/_components/SettingsScrapeSourcesForm'
import { ImportFromGlobalPageButton } from './nominees/_components/ImportFromGlobalPageButton'


type AdminSearchParams = {
  tab?: 'categories' | 'nominees' | 'settings'
  categoryId?: string
}

export default async function AdminUnifiedPage({
  searchParams,
}: {
  searchParams?: Promise<AdminSearchParams>
}) {
  const supabase = await createServerSupabaseClient()
  const sp = (await searchParams) ?? {}
  const activeTab = sp.tab ?? 'categories'
  const selectedCategoryId = sp.categoryId ?? null

  // Categorias
  const { data: categories, error: categoriesErr } = await supabase
    .from('categories')
    .select('id, name, max_nominees, is_active')
    .order('name')

  if (categoriesErr) {
    return <div className="text-sm text-red-600">Erro ao carregar categorias: {categoriesErr.message}</div>
  }

  // Contagem de indicados por categoria
  const { data: nomineesCountRows } = await supabase
    .from('nominees')
    .select('category_id')

  const counts = new Map<string, number>()
  for (const n of nomineesCountRows ?? []) {
    counts.set(n.category_id, (counts.get(n.category_id) ?? 0) + 1)
  }

  // Settings globais
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

  const { data: resultsSetting } = await supabase
    .from('app_settings')
    .select('key, value')
    .eq('key', 'results_published')
    .maybeSingle()

  const { data: ceremonyYearSetting } = await supabase
    .from('app_settings')
    .select('key, value')
    .eq('key', 'ceremony_year')
    .maybeSingle()

  const resultsPublished =
    resultsSetting?.value === true ||
    resultsSetting?.value === 'true' ||
    resultsSetting?.value?.toString?.() === 'true' ||
    false

  // Dados da categoria selecionada (aba Indicados)
  let selectedCategory: { id: string; name: string; max_nominees: number; is_active: boolean } | null = null
  let categoryNominees: Array<{ id: string; name: string; tmdb_data: any; is_winner: boolean }> = []

  async function onImportFromRSS() {
    'use server'
    if (!selectedCategoryId) return
    await importNomineesFromRSS(selectedCategoryId)
  }

  if (activeTab === 'nominees' && selectedCategoryId) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id, name, max_nominees, is_active')
      .eq('id', selectedCategoryId)
      .maybeSingle()

    selectedCategory = cat ?? null

    const { data: nom } = await supabase
      .from('nominees')
      .select('id, name, meta, tmdb_data, is_winner')
      .eq('category_id', selectedCategoryId)
      .order('name')

    categoryNominees = nom ?? []
  }

  // Helper de query string
  const qs = (params: Partial<AdminSearchParams>) => {
    const merged: AdminSearchParams = {
      tab: activeTab,
      categoryId: selectedCategoryId ?? undefined,
      ...params,
    }
    const entries = Object.entries(merged).filter(([, v]) => v && String(v).length > 0)
    const query = new URLSearchParams(entries as any).toString()
    return query ? `?${query}` : ''
  }

  const { data: feeds, error: feedsErr } = await supabase
    .from('rss_feeds')
    .select('id, category_id, url, keywords, enabled, source_name, language')

  const { data: scrapeSources, error: scrapeErr } = await supabase
    .from('scrape_sources')
    .select('id, url, keywords, enabled, source_name, language');

  return (
    <div className="space-y-6">
      {/* Header + Abas */}
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">Painel Administrativo</h1>
        <p className="text-sm text-muted-foreground">Gerencie categorias, indicados e configurações</p>

        <div className="mt-4 flex items-center gap-2">
          <Link href={`/admin${qs({ tab: 'categories', categoryId: undefined })}`}>
            <button
              aria-pressed={activeTab === 'categories'}
              className={`border rounded px-3 py-2 text-sm ${activeTab === 'categories' ? 'bg-muted' : 'bg-card hover:bg-muted'}`}
            >
              Categorias
            </button>
          </Link>

          <Link href={`/admin${qs({ tab: 'nominees' })}`}>
            <button
              aria-pressed={activeTab === 'nominees'}
              className={`border rounded px-3 py-2 text-sm ${activeTab === 'nominees' ? 'bg-muted' : 'bg-card hover:bg-muted'}`}
            >
              Indicados
            </button>
          </Link>

          <Link href={`/admin${qs({ tab: 'settings', categoryId: undefined })}`}>
            <button
              aria-pressed={activeTab === 'settings'}
              className={`border rounded px-3 py-2 text-sm ${activeTab === 'settings' ? 'bg-muted' : 'bg-card hover:bg-muted'}`}
            >
              Configurações
            </button>
          </Link>
        </div>
      </div>

      {/* Aba: Categorias */}
      {activeTab === 'categories' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Categorias do Oscar</h2>
              <p className="text-sm text-muted-foreground">Ative/desative e edite as categorias</p>
            </div>
            <Link href="/admin/categories/new">
              <Button>Nova Categoria</Button>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(categories ?? []).map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </section>
      )}

      {/* Aba: Indicados */}
      {activeTab === 'nominees' && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Indicados por Categoria</h2>
          {!selectedCategoryId && (
            <>
              <p className="text-sm text-muted-foreground">Selecione uma categoria para gerenciar seus indicados.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(categories ?? []).map(cat => {
                  const count = counts.get(cat.id) ?? 0
                  return (
                    <Link
                      key={cat.id}
                      href={`/admin${qs({ tab: 'nominees', categoryId: cat.id })}`}
                      className="border rounded p-4 bg-card hover:bg-muted"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{cat.name}</h3>
                          <p className="text-sm text-muted-foreground">{count} / {cat.max_nominees} indicados</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                          {cat.is_active ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </>
          )}

          {selectedCategoryId && selectedCategory && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{selectedCategory.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {categoryNominees.length} / {selectedCategory.max_nominees} indicados
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ImportFromGlobalPageButton categoryId={selectedCategoryId} />
                  <Link href={`/admin${qs({ tab: 'nominees', categoryId: undefined })}`}>
                    <Button variant="outline">Voltar</Button>
                  </Link>
                </div>
              </div>

              {/* Entrada rápida */}
              <section className="space-y-3">
                <h4 className="text-lg font-semibold">Entrada Rápida</h4>
                <form action={importNominees} className="space-y-3">
                  <input type="hidden" name="category_id" value={selectedCategoryId} />
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
                  <div className="flex items-center gap-2">
                    <input id="replace" type="checkbox" name="replace" defaultChecked />
                    <Label htmlFor="replace" className="text-sm">Substituir os indicados existentes</Label>
                  </div>
                  <Button type="submit">Importar Indicados</Button>
                </form>
              </section>

              {/* Entrada individual e lista */}
              <section className="space-y-4">
                {/* <h4 className="text-lg font-semibold">Entrada Individual</h4>
                <form action={createNominee} className="flex gap-2">
                  <input type="hidden" name="category_id" value={selectedCategoryId} />
                  <Input name="name" placeholder="Nome do indicado" required minLength={2} />
                  <Button type="submit">Adicionar</Button>
                </form> */}

                <h4 className="text-lg font-semibold">Indicados:</h4>
                <ul className="divide-y">
                  {categoryNominees.map((n) => {
                    const posterPath =
                      (n as any)?.tmdb_data?.poster_path ??
                      (n as any)?.tmdb_data?.profile_path ??
                      null
                    const posterUrl = getTmdbImageUrl(posterPath, 'list')

                    return (
                      <li key={n.id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          {posterUrl ? (
                            <Image
                              src={posterUrl}
                              alt={n.name}
                              width={92}
                              height={138}
                              className="rounded border bg-card object-cover"
                            />
                          ) : (
                            <div className="w-[92px] h-[138px] rounded border bg-card grid place-items-center text-[11px] text-foreground/70">
                              Sem imagem
                            </div>
                          )}

                          <div className="flex flex-col">
                            <span className="font-medium">{n.name}</span>

                            {(n as any)?.meta?.film_title && (
                              <span className="text-xs text-foreground/70">
                                Filme: {(n as any).meta.film_title}
                              </span>
                            )}

                            {(n as any)?.tmdb_data?.release_date && (
                              <span className="text-xs text-foreground/70">
                                {new Date((n as any).tmdb_data.release_date).getFullYear()}
                              </span>
                            )}

                            {n.tmdb_data ? (
                              <span className="mt-1 w-fit text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                                TMDB OK
                              </span>
                            ) : (
                              <span className="mt-1 w-fit text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                                TMDB Pendente
                              </span>
                            )}

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
                            <input type="hidden" name="category_id" value={selectedCategoryId} />
                            <input type="hidden" name="type" value="movie" />
                            <Input name="name" placeholder="Título do filme" defaultValue={n.name} className="text-sm w-56" />
                            <Button variant="outline" className="text-sm">Buscar TMDB</Button>
                          </form>

                          <form action={updateNominee} className="flex items-center gap-2">
                            <input type="hidden" name="id" value={n.id} />
                            <Input name="name" defaultValue={n.name} className="text-sm w-56" />
                            <Button variant="outline" className="text-sm">Salvar</Button>
                          </form>

                          <ConfirmDeleteNomineeDialog id={n.id} />

                          <WinnerSetForm
                            categoryId={selectedCategoryId}
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
          )}
        </section>
      )}

      {/* Aba: Configurações */}
      {activeTab === 'settings' && (
        <section className="space-y-6">
          <h2 className="text-lg font-semibold">Configurações Globais</h2>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-foreground/80">Estado atual:</div>
              {betsOpen ? (
                <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  APOSTAS ABERTAS
                </span>
              ) : (
                <span className="inline-flex items-center text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                  APOSTAS FECHADAS
                </span>
              )}
            </div>

            <SettingsBetsForm currentOpen={!!betsOpen} />
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-foreground/80">Publicação dos resultados:</div>
                {resultsPublished ? (
                  <span className="inline-flex items-center text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                    RESULTADOS PUBLICADOS
                  </span>
                ) : (
                  <span className="inline-flex items-center text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                    RESULTADOS OCULTOS
                  </span>
                )}
              </div>

              <SettingsResultsForm currentPublished={!!resultsPublished} />
            </div>
          </div>

          {/* <div className="border-t pt-6"> */}
          {/* <h3 className="text-lg font-semibold">RSS Feeds</h3>
            {feedsErr ? (
              <div className="text-sm text-red-600">Erro ao carregar feeds: {feedsErr.message}</div>
            ) : (
              <SettingsRSSFeedsForm categories={categories ?? []} feeds={feeds ?? []} />
            )} */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold">Global Scrape Sources</h3>
            <div className="mb-3">
              <ImportAllFromGlobalButton />
            </div>
            {scrapeErr ? (
              <div className="text-sm text-red-600">Erro ao carregar fontes: {scrapeErr.message}</div>
            ) : (
              <SettingsScrapeSourcesForm sources={scrapeSources ?? []} />
            )}
          </div>
          {/* <div className="border-t pt-6">
              <h3 className="text-lg font-semibold">Ano da cerimônia</h3>
              <form action={setCeremonyYear} className="flex items-center gap-2">
                <Label htmlFor="ceremony_year">Ano</Label>
                <Input
                  id="ceremony_year"
                  name="ceremony_year"
                  type="number"
                  defaultValue={Number(ceremonyYearSetting?.value) || new Date().getFullYear()}
                />
                <Button type="submit">Salvar</Button>
              </form>
            </div> */}
          {/* <div className="border-t pt-6">
              <h3 className="text-lg font-semibold">Feed Interno (Omelete)</h3>
              <SettingsInternalFeed year={Number(ceremonyYearSetting?.value) || new Date().getFullYear()} />
            </div> */}
          {/* </div> */}
        </section>
      )}
    </div>
  )
}