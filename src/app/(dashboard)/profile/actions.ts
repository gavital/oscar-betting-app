// src/app/(dashboard)/profile/actions.ts
'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
export async function updateProfile(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: { code: 'AUTH_NOT_AUTHENTICATED', message: 'Faça login' } }
  const { error } = await supabase.from('profiles').update({ name }).eq('id', user.id)
  if (error) return { ok: false, error: { code: 'DB_UPDATE_ERROR', message: error.message } }
  return { ok: true }
}