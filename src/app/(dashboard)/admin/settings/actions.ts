'use server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type ActionError = {
  code:
    | 'AUTH_NOT_AUTHENTICATED'
    | 'AUTH_FORBIDDEN'
    | 'VALIDATION_NO_FIELDS'
    | 'DB_SELECT_ERROR'
    | 'DB_UPDATE_ERROR'
    | 'UNKNOWN_ERROR'
  message: string
  field?: string
}

type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: ActionError }

export async function setBetsOpen(formData: FormData): Promise<ActionResult<{ open: boolean }>> {
  revalidatePath('/bets')
  revalidatePath('/bets/[categoryId]') // revalida páginas dinâmicas recarregadas
  revalidatePath('/') // se homepage tiver status global
  return { ok: true, data: { open } }
}

/**
* Alterna a publicação dos resultados globais.
* - Escreve em app_settings.results_published (boolean)
* - Revalida /ranking, /ranking/[userId] e /bets
*/
export async function setResultsPublished(formData: FormData): Promise<ActionResult<{ published: boolean }>> {
  const adminCheck = await requireAdmin()
  if ('error' in adminCheck) return { ok: false, error: adminCheck.error as any }
  const { supabase } = adminCheck

  const raw = String(formData.get('published') ?? '').toLowerCase()
  if (!raw) {
    return { ok: false, error: { code: 'VALIDATION_NO_FIELDS', message: 'Valor de published é obrigatório' } }
  }
  const published = ['true', 'on', '1', 'yes'].includes(raw)

  // Upsert em app_settings
  const { error: upErr } = await supabase
    .from('app_settings')
    .upsert({ key: 'results_published', value: published }, { onConflict: 'key' })

  if (upErr) {
    return { ok: false, error: { code: 'DB_UPDATE_ERROR', message: upErr.message } }
  }

  // Revalida páginas de apostas impactadas
  revalidatePath('/ranking')
  revalidatePath('/ranking/[userId]')
  revalidatePath('/bets')
  return { ok: true, data: { published } }
}