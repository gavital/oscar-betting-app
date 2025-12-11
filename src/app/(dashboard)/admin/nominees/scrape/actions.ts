// src/app/(dashboard)/admin/nominees/scrape/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { scrapeOmeleteArticles } from '@/lib/scrapers/omelete';

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export async function importFromGlobalScrape({ categoryId }: { categoryId?: string }) {
  const adminCheck = await requireAdmin();
  if (!adminCheck?.supabase) return { ok: false, error: 'Unauthorized' };
  const { supabase } = adminCheck;

  // Ler fontes globais habilitadas
  const { data: sources, error: srcErr } = await supabase
    .from('scrape_sources')
    .select('url, enabled')
    .eq('enabled', true);

  if (srcErr) return { ok: false, error: srcErr.message };
  if (!sources || sources.length === 0) {
    return { ok: false, error: 'No global scrape sources configured' };
  }

  // Ler categorias para mapear labels -> category_id
  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .select('id, name, is_active');

  if (catErr) return { ok: false, error: catErr.message };
  const catMap = new Map<string, { id: string; name: string }>();
  for (const c of categories ?? []) {
    catMap.set(normalize(c.name), { id: c.id, name: c.name });
  }

  // Scrape de cada fonte e consolidação por categoria
  const urls = sources.map((s) => s.url);
  const { items, processed, skipped } = await scrapeOmeleteArticles(urls);

  // Filtro opcional por categoryId (se o botão for por categoria)
  let filtered = items;
  if (categoryId) {
    // pega o nome da categoria selecionada e filtra por label equivalente
    const selected = (categories ?? []).find((c) => c.id === categoryId);
    if (!selected) return { ok: false, error: 'Selected category not found' };
    const selectedKey = normalize(selected.name);
    filtered = filtered.filter((it) => normalize(it.category) === selectedKey);
  }

  // Agrupar por categoria (label normalizado)
  const groups = new Map<string, string[]>();
  for (const it of filtered) {
    const key = normalize(it.category);
    const list = groups.get(key) ?? [];
    list.push(it.name.trim());
    groups.set(key, list);
  }

  // Inserir por categoria
  const summary: Array<{ category: string; category_id?: string; imported: number }> = [];

  for (const [key, names] of groups) {
    const cat = catMap.get(key);
    // Se for fluxo por categoria e não casar label, ignore
    if (categoryId && (!cat || cat.id !== categoryId)) continue;

    if (!cat) {
      summary.push({ category: key, imported: 0 });
      continue;
    }

    // Ler nominees existentes para deduplicação
    const { data: existing } = await supabase
      .from('nominees')
      .select('id, name')
      .eq('category_id', cat.id);

    const existingSet = new Set((existing ?? []).map((n) => normalize(n.name)));

    const toInsert: Array<{ name: string; category_id: string }> = [];
    for (const name of names) {
      const norm = normalize(name);
      if (!existingSet.has(norm)) {
        toInsert.push({ name: name.trim(), category_id: cat.id });
        existingSet.add(norm);
      }
    }

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase.from('nominees').insert(toInsert);
      if (insErr) {
        summary.push({ category: cat.name, category_id: cat.id, imported: 0 });
        continue;
      }
    }

    summary.push({ category: cat.name, category_id: cat.id, imported: toInsert.length });
    // Revalidar páginas relacionadas
    revalidatePath(`/admin/nominees/${cat.id}`);
  }

  revalidatePath('/ranking');

  const totalImported = summary.reduce((acc, s) => acc + s.imported, 0);
  return {
    ok: true,
    data: {
      totalImported,
      summary,         // [{ category, category_id, imported }]
      processed,       // URLs processadas
      skipped,         // URLs ignoradas
    },
  };
}