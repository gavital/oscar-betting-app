'use server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// type ActionError = {
//   code:
//     | 'AUTH_NOT_AUTHENTICATED'
//     | 'AUTH_FORBIDDEN'
//     | 'VALIDATION_NO_FIELDS'
//     | 'DB_SELECT_ERROR'
//     | 'DB_UPDATE_ERROR'
//     | 'UNKNOWN_ERROR'
//   message: string
//   field?: string
// }

// type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: ActionError }

// export async function setBetsOpen(formData: FormData): Promise<ActionResult<{ open: boolean }>> {
//   revalidatePath('/bets')
//   revalidatePath('/bets/[categoryId]') // revalida páginas dinâmicas recarregadas
//   revalidatePath('/') // se homepage tiver status global
//   return { ok: true, data: { open } }
// }

// /**
// * Alterna a publicação dos resultados globais.
// * - Escreve em app_settings.results_published (boolean)
// * - Revalida /ranking, /ranking/[userId] e /bets
// */
// export async function setResultsPublished(formData: FormData): Promise<ActionResult<{ published: boolean }>> {
//   const adminCheck = await requireAdmin()
//   if ('error' in adminCheck) return { ok: false, error: adminCheck.error as any }
//   const { supabase } = adminCheck

//   const raw = String(formData.get('published') ?? '').toLowerCase()
//   if (!raw) {
//     return { ok: false, error: { code: 'VALIDATION_NO_FIELDS', message: 'Valor de published é obrigatório' } }
//   }
//   const published = ['true', 'on', '1', 'yes'].includes(raw)

//   // Upsert em app_settings
//   const { error: upErr } = await supabase
//     .from('app_settings')
//     .upsert({ key: 'results_published', value: published }, { onConflict: 'key' })

//   if (upErr) {
//     return { ok: false, error: { code: 'DB_UPDATE_ERROR', message: upErr.message } }
//   }

//   // Revalida páginas de apostas impactadas
//   revalidatePath('/ranking')
//   revalidatePath('/ranking/[userId]')
//   revalidatePath('/bets')
//   return { ok: true, data: { published } }
// }

export async function createRssFeed(input: {
  categoryId: string;
  url: string;
  keywords: string[];
  source_name?: string;
  language?: string;
}) {
  const adminCheck = await requireAdmin();
  if (!adminCheck?.supabase) return { ok: false, error: 'Unauthorized' };
  const { supabase } = adminCheck;

  const { error } = await supabase.from('rss_feeds').insert({
    category_id: input.categoryId,
    url: input.url,
    keywords: input.keywords ?? [],
    source_name: input.source_name ?? null,
    language: input.language ?? null,
    enabled: true,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/settings');
  return { ok: true };
}

export async function updateRssFeed(input: {
  id: string;
  url?: string;
  keywords?: string[];
  source_name?: string | null;
  language?: string | null;
  enabled?: boolean;
}) {
  const adminCheck = await requireAdmin();
  if (!adminCheck?.supabase) return { ok: false, error: 'Unauthorized' };
  const { supabase } = adminCheck;

  const { error } = await supabase
    .from('rss_feeds')
    .update({
      url: input.url,
      keywords: input.keywords,
      source_name: input.source_name,
      language: input.language,
      enabled: input.enabled,
    })
    .eq('id', input.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/settings');
  return { ok: true };
}

export async function deleteRssFeed(id: string) {
  const adminCheck = await requireAdmin();
  if (!adminCheck?.supabase) return { ok: false, error: 'Unauthorized' };
  const { supabase } = adminCheck;

  const { error } = await supabase.from('rss_feeds').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/settings');
  return { ok: true };
}