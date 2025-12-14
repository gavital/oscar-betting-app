// src/app/(dashboard)/admin/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ExpandableCategoryCard } from './categories/ExpandableCategoryCard'
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
import { setCeremonyYear, startNewEdition, purgeCurrentEdition } from './settings/actions'


import { SettingsScrapeSourcesForm } from './settings/_components/SettingsScrapeSourcesForm'
import { ImportFromGlobalPageButton } from './nominees/_components/ImportFromGlobalPageButton'

type AdminSearchParams = { categoryId?: string }

export default async function AdminUnifiedPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createServerSupabaseClient()
  // Desembrulha searchParams (Promise) no Next 16
  const sp = (await searchParams) ?? {}
  const selectedCategoryId =
    typeof sp.categoryId === 'string'
      ? sp.categoryId
      : Array.isArray(sp.categoryId)
        ? sp.categoryId[0]
        : null

  // Ano corrente
  const { data: ceremonyYearSetting } = await supabase
    .from('app_settings')
    .select('key, value')
    .eq('key', 'ceremony_year')
    .maybeSingle()

  const currentYear = Number(ceremonyYearSetting?.value) || new Date().getFullYear()

  // Categorias
  const { data: categories, error: categoriesErr } = await supabase
    .from('categories')
    .select('id, name, max_nominees, is_active, ceremony_year')
    .eq('ceremony_year', currentYear)
    .order('name')

  if (categoriesErr) {
    return <div className="text-sm text-red-600">Erro ao carregar categorias: {categoriesErr.message}</div>
  }

  // Contagem de indicados por categoria
  const { data: nomineesCountRows } = await supabase
    .from('nominees')
    .select('category_id, ceremony_year')
    .eq('ceremony_year', currentYear)

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

  const resultsPublished =
    resultsSetting?.value === true ||
    resultsSetting?.value === 'true' ||
    resultsSetting?.value?.toString?.() === 'true' ||
    false

  // Dados da categoria selecionada (aba Indicados)
  let selectedCategory: { id: string; name: string; max_nominees: number; is_active: boolean } | null = null

  let categoryNominees: Array<{ id: string; name: string; meta?: any; tmdb_data: any; is_winner: boolean }> = []

  if (selectedCategoryId) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id, name, max_nominees, is_active')
      .eq('id', selectedCategoryId)
      .maybeSingle()

    selectedCategory = cat ?? null

    const { data: nom } = await supabase
      .from('nominees')
      .select('id, name, meta, tmdb_data, is_winner, ceremony_year')
      .eq('category_id', selectedCategoryId)
      .eq('ceremony_year', currentYear)
      .order('name')

    categoryNominees = nom ?? []
  }

  // Helper de query string
  const qs = (params: Partial<AdminSearchParams>) => {
    const merged: AdminSearchParams = { categoryId: selectedCategoryId ?? undefined, ...params }
    const entries = Object.entries(merged).filter(([, v]) => v && String(v).length > 0)
    const query = new URLSearchParams(entries as any).toString()
    return query ? `?${query}` : ''
  }

  const { data: scrapeSources, error: scrapeErr } = await supabase
    .from('scrape_sources')
    .select('id, url, keywords, enabled, source_name, language');

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">Administração</h1>
        <p className="text-sm text-muted-foreground">Configurações, categorias e indicados em um só lugar</p>
      </div>
      <section className="space-y-6 mt-4">
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

        <div className="flex items-center justify-between border-t pt-6">
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

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold">Edição da cerimônia</h3>
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

          <div className="mt-3 flex items-center gap-3">
            <form action={startNewEdition}>
              <input type="hidden" name="ceremony_year" value={Number(ceremonyYearSetting?.value) || new Date().getFullYear()} />
              <Button type="submit" variant="outline">Nova Edição (mudar ano)</Button>
            </form>
            <form action={purgeCurrentEdition}>
              <Button type="submit" variant="destructive">Limpar dados da edição atual</Button>
            </form>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Nova edição altera o ano e mantém edições passadas; Limpar dados remove categorias, indicados e apostas apenas do ano atual.
          </p>
        </div>

        <div className="border-t pt-6">
          <details className="rounded-md border bg-card">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium flex items-center justify-between">
              <span>Fontes (Global Scrape)</span>
              <span className="text-xs text-muted-foreground">(clique para expandir/colapsar)</span>
            </summary>
            <div className="px-4 pb-4 space-y-3">
              <div className="mb-2">
                <ImportAllFromGlobalButton />
              </div>
              {scrapeErr ? (
                <div className="text-sm text-red-600">Erro ao carregar fontes: {scrapeErr.message}</div>
              ) : (
                <SettingsScrapeSourcesForm sources={scrapeSources ?? []} />
              )}
            </div>
          </details>
        </div>
      </section>

      <section className="space-y-4 mt-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Categorias do Oscar</h2>
            <p className="text-sm text-muted-foreground">Ative/desative e veja os indicados</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(categories ?? []).map((category) => (
            <ExpandableCategoryCard
              key={category.id}
              category={category}
              ceremonyYear={currentYear}
              nomineesCount={counts.get(category.id) ?? 0}
            />
          ))}

      </section>

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
                    href={`/admin?categoryId=${cat.id}`}
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
                <Link href={`/admin${qs({ categoryId: undefined })}`}>
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
          </div >
        )}
    </div>
  )
}