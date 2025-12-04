'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/requireAdmin'

type ActionError = {
  code:
    | 'AUTH_NOT_AUTHENTICATED'
    | 'AUTH_FORBIDDEN'
    | 'VALIDATION_NO_FIELDS'
    | 'CATEGORY_NOT_FOUND'
    | 'NOMINEE_NOT_IN_CATEGORY'
    | 'DB_UPDATE_ERROR'
    | 'UNKNOWN_ERROR'
  message: string
  field?: string
}

type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: ActionError }

/**
 * Marca um único vencedor para a categoria:
 * - Valida que nominee pertence à category
 * - Limpa is_winner=true dos demais nominees da mesma categoria
 * - Marca is_winner=true para o nominee escolhido
 */
export async function setCategoryWinner(formData: FormData): Promise<ActionResult<{ categoryId: string; nomineeId: string }>> {
  const adminCheck = await requireAdmin()
  if ('error' in adminCheck) return { ok: false, error: adminCheck.error as any }
  const { supabase } = adminCheck

  const categoryId = String(formData.get('category_id') ?? '').trim()
  const nomineeId = String(formData.get('nominee_id') ?? '').trim()

  if (!categoryId || !nomineeId) {
    return { ok: false, error: { code: 'VALIDATION_NO_FIELDS', message: 'Campos obrigatórios ausentes' } }
  }

  // Categoria existe?
  const { data: category, error: catErr } = await supabase
    .from('categories')
    .select('id, is_active')
    .eq('id', categoryId)
    .single()
  if (catErr || !category) {
    return { ok: false, error: { code: 'CATEGORY_NOT_FOUND', message: 'Categoria não encontrada', field: 'category_id' } }
  }

  // Nominee pertence à categoria?
  const { data: nominee, error: nomErr } = await supabase
    .from('nominees')
    .select('id, category_id')
    .eq('id', nomineeId)
    .eq('category_id', categoryId)
    .single()
  if (nomErr || !nominee) {
    return { ok: false, error: { code: 'NOMINEE_NOT_IN_CATEGORY', message: 'Indicado não pertence à categoria', field: 'nominee_id' } }
  }

  // Limpa vencedores anteriores (se houver) nesta categoria
  const { error: clearErr } = await supabase
    .from('nominees')
    .update({ is_winner: false })
    .eq('category_id', categoryId)
    .eq('is_winner', true)
  if (clearErr) {
    return { ok: false, error: { code: 'DB_UPDATE_ERROR', message: clearErr.message } }
  }

  // Marca novo vencedor
  const { error: winErr } = await supabase
    .from('nominees')
    .update({ is_winner: true })
    .eq('id', nomineeId)
    .eq('category_id', categoryId)

  if (winErr) {
    return { ok: false, error: { code: 'DB_UPDATE_ERROR', message: winErr.message } }
  }

  // Revalida páginas relacionadas
  revalidatePath(`/admin/nominees/${categoryId}`)
  revalidatePath('/ranking')
  return { ok: true, data: { categoryId, nomineeId } }
}