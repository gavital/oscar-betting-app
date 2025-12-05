// src/app/(auth)/forgot/actions.ts
'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
export async function sendResetEmail(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { ok: false, error: { code: 'VALIDATION_NO_FIELDS', message: 'E-mail obrigatório' } }
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset`,
  })
  if (error) return { ok: false, error: { code: 'AUTH_RESET_ERROR', message: error.message } }
  return { ok: true }
}