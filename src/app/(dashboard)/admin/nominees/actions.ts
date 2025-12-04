// src/app/(dashboard)/admin/nominees/actions.ts
'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/requireAdmin'

function log(scope: string, message: string, data?: any) {
  const ts = new Date().toISOString();
  if (data !== undefined) {
    console.log(`[${ts}] [nominees:${scope}] ${message}`, data);
  } else {
    console.log(`[${ts}] [nominees:${scope}] ${message}`);
  }
}

export function normalizeNomineeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function correlationId() {
  return Math.random().toString(36).slice(2, 10);
}

type ActionErrorCode =
  | 'VALIDATION_ID_REQUIRED'
  | 'VALIDATION_NAME_MIN_LENGTH'
  | 'VALIDATION_NO_FIELDS'
  | 'AUTH_NOT_AUTHENTICATED'
  | 'AUTH_FORBIDDEN'
  | 'DB_SELECT_ERROR'
  | 'DB_INSERT_ERROR'
  | 'DB_UPDATE_ERROR'
  | 'DB_DELETE_ERROR'
  | 'CATEGORY_NOT_FOUND'
  | 'NOMINEE_NAME_DUPLICATE'
  | 'LIMIT_EXCEEDED'
  | 'HAS_ASSOCIATED_BETS'
  | 'UNKNOWN_ERROR'

export type ActionError = {
  code: ActionErrorCode
  message: string
  field?: 'id' | 'name' | 'category_id' | 'auth' | 'role'
  details?: any
}

export type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: ActionError }

export async function importNominees(formData: FormData): Promise<ActionResult<{ imported: number; removedDuplicates: number; truncated: number }>> {
  const cid = correlationId();
  log('createNominee', 'start', { cid });

  const adminCheck = await requireAdmin();
  if ('error' in adminCheck) return { ok: false, error: adminCheck.error as any }
  const { supabase } = adminCheck;

  const category_id = String(formData.get('category_id') || '')
  const raw = String(formData.get('bulk_text') || '')
  const replaceFlag = String(formData.get('replace') || 'false').toLowerCase()
  const replace = ['true', 'on', '1', 'yes'].includes(replaceFlag)

  if (!category_id || !raw.trim()) {
    return { ok: false, error: { code: 'VALIDATION_NO_FIELDS', message: 'Dados insuficientes' } }
  }

  const { data: category, error: catErr } = await supabase
    .from('categories')
    .select('id, max_nominees')
    .eq('id', category_id)
    .single()
  if (catErr) return { ok: false, error: { code: 'DB_SELECT_ERROR', message: catErr.message, field: 'category_id' } }
  if (!category) return { ok: false, error: { code: 'CATEGORY_NOT_FOUND', message: 'Categoria não encontrada', field: 'category_id' } }

  const lines = raw.split('\n').map(s => s.trim()).filter(Boolean)
  const normalizedLower = Array.from(new Set(lines.map(l => l.toLowerCase())))
  const toImportLower = normalizedLower.slice(0, category.max_nominees)

  // Checa limite atual se não for replace: não exceder max_nominees
  if (!replace) {
    const { count, error: countErr } = await supabase
      .from('nominees')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', category_id)
    if (countErr) return { ok: false, error: { code: 'DB_SELECT_ERROR', message: countErr.message } }
    const finalCount = (count ?? 0) + toImportLower.length
    if (finalCount > category.max_nominees) {
      return { ok: false, error: { code: 'LIMIT_EXCEEDED', message: 'Importação excede o limite da categoria' } }
    }
  }

  if (replace) {
    const { error: delError } = await supabase.from('nominees').delete().eq('category_id', category_id)
    if (delError) return { ok: false, error: { code: 'DB_DELETE_ERROR', message: delError.message } }
  }

  // Preserva capitalização original do primeiro match
  const payload = toImportLower.map(nameLower => ({
    category_id,
    name: lines.find(l => l.toLowerCase() === nameLower)!,
  }))

  const { error: insError } = await supabase.from('nominees').insert(payload)
  if (insError) return { ok: false, error: { code: 'DB_INSERT_ERROR', message: insError.message } }

  revalidatePath(`/admin/nominees/${category_id}`)
  return {
    ok: true,
    data: {
      imported: payload.length,
      removedDuplicates: lines.length - normalizedLower.length,
      truncated: normalizedLower.length > category.max_nominees ? normalizedLower.length - category.max_nominees : 0,
    }
  }
}

export async function createNominee(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const cid = correlationId();
  log('createNominee', 'start', { cid });

  const adminCheck = await requireAdmin();
  if ('error' in adminCheck) return { ok: false, error: adminCheck.error as any }
  const { supabase } = adminCheck;

  const category_id = String(formData.get('category_id') || '')
  const name = String(formData.get('name') || '').trim()
  if (!category_id || name.length < 2) {
    log('createNominee', 'validation fail', { cid, reason: 'name min length or missing category_id' });
    return { ok: false, error: { code: 'VALIDATION_NAME_MIN_LENGTH', message: 'Nome deve ter pelo menos 2 caracteres', field: 'name' } }
  }

  const { data: category, error: catErr } = await supabase.from('categories').select('id, max_nominees').eq('id', category_id).single()
  if (catErr) return { ok: false, error: { code: 'DB_SELECT_ERROR', message: catErr.message } }
  log('createNominee', 'category', { cid, category });


  const { count, error: countErr } = await supabase
    .from('nominees')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', category_id)
  log('createNominee', 'current count', { cid, count, countErr });
  if (countErr) return { ok: false, error: { code: 'DB_SELECT_ERROR', message: countErr.message } }
  if ((count ?? 0) >= (category?.max_nominees ?? 0)) {
    log('createNominee', 'limit exceeded', { cid, count, max: category?.max_nominees });
    return { ok: false, error: { code: 'LIMIT_EXCEEDED', message: 'Limite de indicados atingido' } }
  }

  const { data: dup, error: dupErr } = await supabase
    .from('nominees')
    .select('id')
    .eq('category_id', category_id)
    .ilike('name', name)
    .maybeSingle()
  if (dupErr) return { ok: false, error: { code: 'DB_SELECT_ERROR', message: dupErr.message } }
  if (dup) return { ok: false, error: { code: 'NOMINEE_NAME_DUPLICATE', message: 'Indicado já existe nesta categoria', field: 'name' } }

  const { data: inserted, error: insError } = await supabase
    .from('nominees')
    .insert({ category_id, name })
    .select('id')
    .single()
  if (insError) return { ok: false, error: { code: 'DB_INSERT_ERROR', message: insError.message } }

  revalidatePath(`/admin/nominees/${category_id}`)
  revalidatePath('/admin/nominees')
  log('createNominee', 'revalidatePath', { cid, path: `/admin/nominees/${category_id}` });
  return { ok: true, data: { id: inserted!.id } }
}

export async function updateNominee(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const cid = correlationId();
  log('createNominee', 'start', { cid });

  const adminCheck = await requireAdmin();
  if ('error' in adminCheck) return { ok: false, error: adminCheck.error as any }
  const { supabase } = adminCheck;

  const id = String(formData.get('id') || '')
  const name = formData.get('name') != null ? String(formData.get('name')).trim() : undefined

  if (!id) return { ok: false, error: { code: 'VALIDATION_ID_REQUIRED', message: 'ID é obrigatório', field: 'id' } }

  const { data: nominee, error: selErr } = await supabase
    .from('nominees')
    .select('id, category_id')
    .eq('id', id)
    .single()
  if (selErr) return { ok: false, error: { code: 'DB_SELECT_ERROR', message: selErr.message } }

  if (name && name.length < 2) {
    return { ok: false, error: { code: 'VALIDATION_NAME_MIN_LENGTH', message: 'Nome deve ter pelo menos 2 caracteres', field: 'name' } }
  }
  if (name) {
    const { data: dup } = await supabase
      .from('nominees')
      .select('id')
      .eq('category_id', nominee!.category_id)
      .ilike('name', name)
      .neq('id', id)
      .maybeSingle()
    if (dup) return { ok: false, error: { code: 'NOMINEE_NAME_DUPLICATE', message: 'Já existe indicado com este nome', field: 'name' } }
  }

  const updatePayload: any = {}
  if (name !== undefined) updatePayload.name = name

  const { error: updErr } = await supabase.from('nominees').update(updatePayload).eq('id', id)
  if (updErr) return { ok: false, error: { code: 'DB_UPDATE_ERROR', message: updErr.message } }

  revalidatePath(`/admin/nominees/${nominee!.category_id}`)
  return { ok: true, data: { id } }
}

export async function deleteNominee(formData: FormData): Promise<ActionResult> {
  const cid = correlationId();
  log('createNominee', 'start', { cid });

  const adminCheck = await requireAdmin();
  if ('error' in adminCheck) return { ok: false, error: adminCheck.error as any }
  const { supabase } = adminCheck;

  const id = String(formData.get('id') || '')
  if (!id) return { ok: false, error: { code: 'VALIDATION_ID_REQUIRED', message: 'ID é obrigatório', field: 'id' } }

  // Impedir remoção se há apostas associadas
  const { count, error: betErr } = await supabase
    .from('bets')
    .select('*', { count: 'exact', head: true })
    .eq('nominee_id', id)
  if (betErr) return { ok: false, error: { code: 'DB_SELECT_ERROR', message: betErr.message } }
  if ((count ?? 0) > 0) {
    return { ok: false, error: { code: 'HAS_ASSOCIATED_BETS', message: 'Não é possível excluir: possui apostas associadas' } }
  }

  const { data: nominee } = await supabase.from('nominees').select('category_id').eq('id', id).single()
  const { error: delErr } = await supabase.from('nominees').delete().eq('id', id)
  if (delErr) return { ok: false, error: { code: 'DB_DELETE_ERROR', message: delErr.message } }

  revalidatePath(`/admin/nominees/${nominee!.category_id}`)
  return { ok: true }
}

export async function enrichNomineeWithOmdb(formData: FormData): Promise<ActionResult> {
  const cid = correlationId();
  log('createNominee', 'start', { cid });

  const { supabase, error } = await requireAdmin()
  if (error) return { ok: false, error }

  const id = String(formData.get('id') || '')
  if (!id) return { ok: false, error: { code: 'VALIDATION_ID_REQUIRED', message: 'ID é obrigatório', field: 'id' } }

  const { data: nominee, error: selErr } = await supabase
    .from('nominees')
    .select('id, name, category_id')
    .eq('id', id)
    .single()
  if (selErr) return { ok: false, error: { code: 'DB_SELECT_ERROR', message: selErr.message } }

  // Busca OMDb por título (ajuste conforme o tipo de categoria: filme, diretor, ator etc.)
  const apiKey = process.env.OMDB_API_KEY
  if (!apiKey) return { ok: false, error: { code: 'UNKNOWN_ERROR', message: 'OMDb API key não configurada' } }

  // Estratégia simples: tentativa por title (t), fallback por search (s) e primeiro resultado
  const urlTitle = `https://www.omdbapi.com/?t=${encodeURIComponent(nominee.name)}&apikey=${apiKey}`
  let omdb = await fetch(urlTitle, { cache: 'no-store' }).then(r => r.json()).catch(() => null)

  if (!omdb || omdb.Response === 'False') {
    const urlSearch = `https://www.omdbapi.com/?s=${encodeURIComponent(nominee.name)}&type=movie&apikey=${apiKey}`
    const search = await fetch(urlSearch, { cache: 'no-store' }).then(r => r.json()).catch(() => null)
    const first = Array.isArray(search?.Search) ? search.Search[0] : null
    if (first?.imdbID) {
      const urlById = `https://www.omdbapi.com/?i=${first.imdbID}&plot=short&apikey=${apiKey}`
      omdb = await fetch(urlById, { cache: 'no-store' }).then(r => r.json()).catch(() => null)
    }
  }

  if (!omdb || omdb.Response === 'False') {
    // Não encontrou
    const { error: updErr } = await supabase
      .from('nominees')
      .update({ imdb_id: null, imdb_data: null })
      .eq('id', id)
    if (updErr) return { ok: false, error: { code: 'DB_UPDATE_ERROR', message: updErr.message } }
    revalidatePath(`/admin/nominees/${nominee.category_id}`)
    return { ok: true }
  }

  const imdbPayload = {
    imdb_id: omdb.imdbID ?? null,
    imdb_data: {
      title: omdb.Title,
      year: omdb.Year,
      poster: omdb.Poster,
      plot: omdb.Plot,
      genre: omdb.Genre,
      director: omdb.Director,
      actors: omdb.Actors,
      ratings: omdb.Ratings,
    }
  }

  const { error: updErr } = await supabase.from('nominees').update(imdbPayload).eq('id', id)
  if (updErr) return { ok: false, error: { code: 'DB_UPDATE_ERROR', message: updErr.message } }

  revalidatePath(`/admin/nominees/${nominee.category_id}`)
  return { ok: true }
}

export async function enrichNomineeWithTMDB(formData: FormData) {
  const nomineeId = String(formData.get('nominee_id') ?? '').trim()
  const categoryId = String(formData.get('category_id') ?? '').trim()
  const queryName = String(formData.get('name') ?? '').trim()
  const type = String(formData.get('type') ?? 'movie') // 'movie' | 'person'

  if (!nomineeId || !categoryId || !queryName) {
    return { ok: false, error: 'INVALID_INPUT' as const }
  }

  const adminCheck = await requireAdmin();
  if ('error' in adminCheck) return { ok: false, error: adminCheck.error as any }
  const { supabase } = adminCheck;

  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) return { ok: false, error: 'TMDB_API_KEY_MISSING' as const }

  const endpoint =
    type === 'person'
      ? `https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(queryName)}&language=pt-BR&include_adult=false&api_key=${apiKey}`
      : `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(queryName)}&language=pt-BR&include_adult=false&api_key=${apiKey}`

  const res = await fetch(endpoint, { cache: 'no-store' })
  if (!res.ok) {
    return { ok: false, error: 'TMDB_FETCH_FAILED' as const }
  }

  const json = await res.json() as any
  const first = Array.isArray(json?.results) ? json.results[0] : null
  if (!first) {
    return { ok: false, error: 'TMDB_NO_RESULTS' as const }
  }

  const tmdbId = String(first.id)
  const tmdbData = first

  const { error: upErr } = await supabase
    .from('nominees')
    .update({ tmdb_id: tmdbId, tmdb_data: tmdbData })
    .eq('id', nomineeId)
    .eq('category_id', categoryId)

  if (upErr) {
    return { ok: false, error: 'DB_UPDATE_ERROR', message: upErr.message }
  }

  revalidatePath(`/admin/nominees/${categoryId}`)
  return { ok: true }
}
