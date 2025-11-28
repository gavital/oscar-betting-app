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
    | 'UNKNOWN_ERROR'
  message: string
  field?: string
}

type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: ActionError }

export async function confirmBet(formData: FormData): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: { code: 'AUTH_NOT_AUTHENTICATED', message: 'Faça login' } }

  const category_id = String(formData.get('category_id') || '')
  const nominee_id = String(formData.get('nominee_id') || '')
  if (!category_id || !nominee_id) {
    return { ok: false, error: { code: 'VALIDATION_NO_FIELDS', message: 'Selecione um indicado' } }
  }

  // Checa bets_open = true::jsonb
  const { data: setting, error: setErr } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'bets_open')
    .single()
  if (setErr) return { ok: false, error: { code: 'DB_SELECT_ERROR', message: setErr.message } }

  const betsOpen = setting?.value === true || setting?.value === 'true' || setting?.value?.toString?.() === 'true'
  if (!betsOpen) return { ok: false, error: { code: 'AUTH_FORBIDDEN', message: 'Apostas encerradas' } }

  // Upsert por (user_id, category_id)
  const { error: upsertErr } = await supabase
    .from('bets')
    .upsert(
      { user_id: user.id, category_id, nominee_id },
      { onConflict: 'user_id,category_id' },
    )
  if (upsertErr) return { ok: false, error: { code: 'DB_INSERT_ERROR', message: upsertErr.message } }

  revalidatePath('/bets')
  revalidatePath(`/bets/${category_id}`)
  return { ok: true }
}