// src/app/(dashboard)/profile/actions.ts
'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type ActionError = {
  code: 'AUTH_NOT_AUTHENTICATED' | 'DB_UPDATE_ERROR' | 'VALIDATION_NO_FIELDS'
  message: string
}

type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: ActionError }

export async function updateProfile(formData: FormData): Promise<ActionResult<{ name: string }>> {
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { ok: false, error: { code: 'VALIDATION_NO_FIELDS', message: 'Nome obrigatório' } }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: { code: 'AUTH_NOT_AUTHENTICATED', message: 'Faça login' } }

  const { error } = await supabase
    .from('profiles')
    .update({ name })
    .eq('id', user.id)

  if (error) {
    return { ok: false, error: { code: 'DB_UPDATE_ERROR', message: error.message } }
  }

  return { ok: true, data: { name } }
}