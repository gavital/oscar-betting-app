'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type ActionError = {
  code:
  | 'AUTH_NOT_AUTHENTICATED'
  | 'AUTH_FORBIDDEN'
  | 'VALIDATION_NO_FIELDS'
  | 'DB_SELECT_ERROR'
  | 'DB_INSERT_ERROR'
  | 'CATEGORY_NOT_FOUND'
  | 'NOMINEE_NOT_IN_CATEGORY'
  | 'UNKNOWN_ERROR'
  message: string
  field?: string
}

type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: ActionError }

export async function confirmBet(formData: FormData): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: { code: 'AUTH_NOT_AUTHENTICATED', message: 'Faça login' } }
  }

  const category_id = String(formData.get('category_id') || '')
  const nominee_id = String(formData.get('nominee_id') || '')
  
  if (!category_id || !nominee_id) {
    return { ok: false, error: { code: 'VALIDATION_NO_FIELDS', message: 'Selecione um indicado' } }
  }

  // 1) Categoria existe e está ativa?
  const { data: category, error: catErr } = await supabase
    .from('categories')
    .select('id, is_active')
    .eq('id', category_id)
    .single()

  if (catErr || !category || category.is_active !== true) {
    return {
      ok: false,
      error: {
        code: 'CATEGORY_NOT_FOUND',
        message: 'Categoria inexistente ou inativa',
        field: 'category_id',
      },
    }
  }

  // 2) Nominee pertence à categoria?
  const { data: nominee, error: nomErr } = await supabase
    .from('nominees')
    .select('id, category_id')
    .eq('id', nominee_id)
    .eq('category_id', category_id)
    .single()

  if (nomErr || !nominee) {
    return {
      ok: false,
      error: {
        code: 'NOMINEE_NOT_IN_CATEGORY',
        message: 'Indicado não pertence à categoria informada',
        field: 'nominee_id',
      },
    }
  }

  // 3) Apostas abertas?
  const { data: setting, error: setErr } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'bets_open')
    .single()

  // Fallback: se a linha não existir (Row not found), assumimos aberto
  const rowNotFound = setErr && /row not found/i.test(setErr.message)
  if (setErr && !rowNotFound) {
    return { ok: false, error: { code: 'DB_SELECT_ERROR', message: setErr.message } }
  }

  const betsOpen =
    rowNotFound
      ? true
      : setting?.value === true ||
      setting?.value === 'true' ||
      setting?.value?.toString?.() === 'true'

  if (!betsOpen) {
    return { ok: false, error: { code: 'AUTH_FORBIDDEN', message: 'Apostas encerradas' } }
  }

  // 4) Upsert por (user_id, category_id)
  const { error: upsertErr } = await supabase
    .from('bets')
    .upsert(
      { user_id: user.id, category_id, nominee_id },
      { onConflict: 'user_id,category_id' }
    )

  if (upsertErr) {
    return { ok: false, error: { code: 'DB_INSERT_ERROR', message: upsertErr.message } }
  }

  revalidatePath('/bets')
  revalidatePath(`/bets/${category_id}`)
  return { ok: true }
}