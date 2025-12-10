// src/app/(dashboard)/admin/nominees/rss/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { fetchCandidatesFromFeeds } from '@/lib/rss/parser';
import { normalizeNomineeName } from '@/app/(dashboard)/admin/nominees/utils';
import { RSS_FEEDS } from '@/config/rss-feeds';

export async function importNomineesFromRSS(categoryId: string) {
  const adminCheck = await requireAdmin();
  if (!adminCheck?.supabase) {
    return { ok: false, error: 'Unauthorized' };
  }
  const { supabase } = adminCheck;

  // Carrega feeds habilitados para a categoria
  const { data: feeds, error: feedsErr } = await supabase
    .from('rss_feeds')
    .select('id, url, keywords, enabled')
    .eq('category_id', categoryId)
    .eq('enabled', true);

  if (feedsErr) return { ok: false, error: feedsErr.message };
  if (!feeds || feeds.length === 0) {
    return { ok: false, error: 'No enabled RSS feeds for this category' };
  }

  const urls = feeds.map(f => f.url);
  const { data: ceremonyYearSetting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'ceremony_year')
    .maybeSingle();

  const yearKeyword = ceremonyYearSetting?.value
    ? String(ceremonyYearSetting.value)
    : String(new Date().getFullYear());

  const allKeywords = Array.from(
    new Set([
      ...((feeds.flatMap(f => f.keywords ?? []) as string[]).map(k => k.toLowerCase())),
      yearKeyword.toLowerCase(),
    ])
  );

  // const allKeywords = Array.from(
  //   new Set((feeds.flatMap(f => f.keywords ?? []) as string[]).map(k => k.toLowerCase()))
  // );

  // Carrega nominees existentes
  const { data: existing, error: exErr } = await supabase
    .from('nominees')
    .select('id, name')
    .eq('category_id', categoryId);

  if (exErr) return { ok: false, error: exErr.message };

  const existingSet = new Set(
    (existing ?? []).map(n => normalizeNomineeName(n.name).toLowerCase())
  );

  // Varre RSS
  const candidates = await fetchCandidatesFromFeeds(urls, allKeywords);
  const toInsert: Array<{ name: string; category_id: string }> = [];

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