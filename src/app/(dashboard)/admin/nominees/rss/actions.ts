// src/app/(dashboard)/admin/nominees/rss/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { normalizeNomineeName } from '@/app/(dashboard)/admin/nominees/utils';
import { fetchCandidatesFromFeeds } from '@/lib/rss/parser';
import { RSS_FEEDS } from '@/config/rss-feeds';

export async function importNomineesFromRSS(categoryId: string) {
  const adminCheck = await requireAdmin();
  if (!adminCheck?.supabase) {
    return { ok: false, error: 'Unauthorized' };
  }
  const { supabase } = adminCheck;

  const cfg = RSS_FEEDS.find(c => c.categoryId === categoryId);
  if (!cfg) return { ok: false, error: 'RSS config not found for category' };

  // Buscar existentes para deduplicação
  const { data: existing } = await supabase
    .from('nominees')
    .select('id, name')
    .eq('category_id', categoryId);

  const existingSet = new Set(
    (existing ?? []).map(n => normalizeNomineeName(n.name).toLowerCase())
  );

  // Varrer RSS
  const candidates = await fetchCandidatesFromFeeds(cfg.urls, cfg.keywords ?? []);
  const toInsert = [];

  for (const c of candidates) {
    const normalized = normalizeNomineeName(c.name);
    const key = normalized.toLowerCase();
    if (!existingSet.has(key)) {
      toInsert.push({
        name: normalized,
        category_id: categoryId,
        // Campos extras: 'type' se houver, ou tmdb_id após enriquecimento
      });
      existingSet.add(key);
    }
  }

  if (toInsert.length === 0) {
    return { ok: true, data: { imported: 0 }, message: 'No new nominees found' };
  }

  const { error: insertErr } = await supabase.from('nominees').insert(toInsert);
  if (insertErr) {
    return { ok: false, error: insertErr.message };
  }

  // Opcional: enriquecer com TMDB aqui (buscar poster_path), se necessário

  // Revalidar páginas relacionadas
  revalidatePath(`/admin/nominees/${categoryId}`);
  revalidatePath('/ranking');

  return { ok: true, data: { imported: toInsert.length } };
}