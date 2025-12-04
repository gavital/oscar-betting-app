'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/requireAdmin'

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
  const adminCheck = await requireAdmin()
  if ('error' in adminCheck) return { ok: false, error: adminCheck.error as any }
  const { supabase } = adminCheck

  const raw = String(formData.get('open') ?? '').toLowerCase()
  if (!raw) {
    return { ok: false, error: { code: 'VALIDATION_NO_FIELDS', message: 'Valor de open é obrigatório' } }
  }
  const open = ['true', 'on', '1', 'yes'].includes(raw)

  // Upsert em app_settings
  const { error: upErr } = await supabase
    .from('app_settings')
    .upsert({ key: 'bets_open', value: open }, { onConflict: 'key' })

  if (upErr) {
    return { ok: false, error: { code: 'DB_UPDATE_ERROR', message: upErr.message } }
  }

  // Revalida páginas de apostas
  revalidatePath('/bets')
  return { ok: true, data: { open } }
}