'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function setBetsOpen(formData: FormData) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: { message: 'Faça login' } }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { ok: false, error: { message: 'Acesso negado' } }

  const enabled = String(formData.get('bets_open') || 'false').toLowerCase()
  const value = (['true', 'on', '1', 'yes'].includes(enabled)) ? 'true' : 'false'

  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: 'bets_open', value: (value === 'true') ? true : false }, { onConflict: 'key' })

  if (error) return { ok: false, error: { message: error.message } }
  revalidatePath('/admin/settings')
  return { ok: true }
}