'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil } from 'lucide-react'
import { showErrorToast, showSuccessToast } from '@/lib/ui/messages'
import { toggleCategoryActiveAction } from './actions'
import { ImportFromGlobalPageButton } from '../nominees/_components/ImportFromGlobalPageButton'
import ConfirmDeleteNomineeDialog from '../nominees/_components/ConfirmDeleteNomineeDialog'
import WinnerSetForm from '../nominees/_components/WinnerSetForm'
import { importNominees, updateNominee, enrichNomineeWithTMDB } from '../nominees/actions'
import { getTmdbImageUrl } from '@/lib/tmdb/client'

type Category = {
  id: string
  name: string
  max_nominees: number
  is_active: boolean
}

type Nominee = {
  id: string
  name: string
  meta?: { film_title?: string }
  tmdb_data?: any
  is_winner: boolean
}

export function ExpandableCategoryCard({
  category,
  ceremonyYear,
  nomineesCount = 0,
  expanded,
  onToggle,
}: {
  category: Category
  ceremonyYear: number
  nomineesCount?: number
  expanded: boolean
  onToggle: (categoryId: string, nextExpanded: boolean) => void
}) {
  const [isActive, setIsActive] = useState(category.is_active)
  const [pending, setPending] = useState(false)

  const [loadingNominees, setLoadingNominees] = useState(false)
  const [nominees, setNominees] = useState<Nominee[]>([])

  // Busca on-demand quando expandido e ainda não carregou
  useEffect(() => {
    if (!expanded || nominees.length > 0 || loadingNominees) return
    setLoadingNominees(true)
      ; (async () => {
        try {
          const res = await fetch(
            `/api/admin/categories/${category.id}/nominees?year=${ceremonyYear}`,
            { cache: 'no-store' }
          )
          const data = await res.json()
          if (data.ok) {
            setNominees(data.items ?? [])
          } else {
            showErrorToast(data.error || 'Falha ao carregar indicados')
          }
        } catch (err: any) {
          showErrorToast(err?.message ?? 'Erro de rede')
        } finally {
          setLoadingNominees(false)
        }
      })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  function handleExpandClick() {
    onToggle(category.id, !expanded)
  }

  return (
    // Quando expandido, o item da grade ocupa a largura total
    <div className={expanded ? 'col-span-full w-full' : ''}>
      <Card id={`category-${category.id}`} className={`card-oscar ${expanded ? 'overflow-visible' : 'overflow-hidden'}`}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <CardTitle className="text-lg">{category.name}</CardTitle>
              <CardDescription>{nomineesCount} / {category.max_nominees} indicados</CardDescription>
            </div>
            <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-muted'}`} />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <form
              action={async (fd: FormData) => {
                try {
                  const next = !isActive
                  fd.set('id', category.id)
                  fd.set('nextState', String(next))
                  const res = await toggleCategoryActiveAction(null, fd)
                  if (res?.ok) {
                    setIsActive(next)
                    showSuccessToast('Categoria atualizada')
                  } else {
                    showErrorToast(res?.error ?? 'Falha ao atualizar categoria')
                  }
                } catch (e) {
                  showErrorToast('Falha ao atualizar categoria')
                }
              }}
              className="flex items-center space-x-2"
            >
              <input type="hidden" name="id" value={category.id} />
              <input type="hidden" name="nextState" value={String(!isActive)} />
              <label className="flex items-center space-x-2 cursor-pointer">
                <Switch checked={isActive} disabled={pending} onCheckedChange={() => {
                  setPending(true)
                  const form = new FormData()
                  form.set('id', category.id)
                  form.set('nextState', String(!isActive))
                  toggleCategoryActiveAction(null, form).then((res) => {
                    if (res?.ok) {
                      setIsActive(!isActive)
                      showSuccessToast('Categoria atualizada')
                    } else {
                      showErrorToast(res?.error ?? 'Falha ao atualizar categoria')
                    }
                  }).finally(() => setPending(false))
                }} />
                <span className="text-sm">{isActive ? 'Ativa' : 'Inativa'}</span>
              </label>
            </form>

            <div className="flex items-center gap-2">
              <Link href={`/admin/categories/${category.id}/edit`}>
                <Button variant="ghost" size="sm">
                  <Pencil className="h-4 w-4" />
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleExpandClick}>
                {expanded ? 'Recolher' : 'Expandir'}
              </Button>
            </div>
          </div>

          {expanded && (
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {loadingNominees ? 'Carregando indicados...' : `Indicados (${nominees.length})`}
                </div>
                <ImportFromGlobalPageButton categoryId={category.id} />
              </div>

              {/* Entrada rápida */}
              <section className="space-y-3">
                <h4 className="text-sm font-semibold">Entrada Rápida</h4>
                <form action={importNominees} className="space-y-3">
                  <input type="hidden" name="category_id" value={category.id} />
                  <Label htmlFor={`bulk_text_${category.id}`}>Cole a lista de indicados (um por linha)</Label>
                  <textarea
                    id={`bulk_text_${category.id}`}
                    name="bulk_text"
                    className="w-full border rounded p-2 h-32 bg-card text-foreground"
                    placeholder="Ex:\nFilme A\nFilme B\nFilme C"
                  />
                  <div className="text-xs text-foreground/70">
                    Duplicatas serão removidas automaticamente. Linhas em branco são ignoradas.
                  </div>
                  <div className="flex items-center gap-2">
                    <input id={`replace_${category.id}`} type="checkbox" name="replace" defaultChecked />
                    <Label htmlFor={`replace_${category.id}`} className="text-sm">Substituir os indicados existentes</Label>
                  </div>
                  <Button type="submit" size="sm">Importar Indicados</Button>
                </form>
              </section>

              {/* Lista de indicados */}
              <ul className="divide-y">
                {nominees.map((n) => {
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
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <form action={enrichNomineeWithTMDB} className="flex items-center gap-2">
                          <input type="hidden" name="nominee_id" value={n.id} />
                          <input type="hidden" name="category_id" value={category.id} />
                          <input type="hidden" name="type" value="movie" />
                          <Input name="name" placeholder="Título do filme" defaultValue={n.name} className="text-sm w-44" />
                          <Button variant="outline" className="text-sm">Buscar TMDB</Button>
                        </form>

                        <form action={updateNominee} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={n.id} />
                          <Input name="name" defaultValue={n.name} className="text-sm w-44" />
                          <Button variant="outline" className="text-sm">Salvar</Button>
                        </form>

                        <ConfirmDeleteNomineeDialog id={n.id} />
                        <WinnerSetForm categoryId={category.id} nomineeId={n.id} disabled={!!n.is_winner} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}