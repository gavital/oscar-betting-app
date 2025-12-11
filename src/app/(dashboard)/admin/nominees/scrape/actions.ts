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

// Sinônimos para casar labels do site com nomes de categorias do banco
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  'melhor edicao': ['melhor montagem', 'montagem'],
  'melhor montagem': ['melhor edicao', 'edicao'],
  'melhor filme de animacao': ['melhor animacao', 'animacao'],
  'melhor documentario': ['documentario'],
  'melhor documentario em curta': ['documentario em curta', 'curta documentario'],
  'melhor curta de animacao': ['curta animacao'],
  'melhor curta live action': ['curta live action', 'curta ficcao'],
  'melhor roteiro original': ['roteiro original'],
  'melhor roteiro adaptado': ['roteiro adaptado'],
  'melhor design de producao': ['design de producao', 'direcao de arte'],
  'melhor maquiagem e penteado': ['maquiagem e penteado', 'maquiagem'],
  'melhor trilha sonora': ['trilha sonora'],
  'melhor cancao original': ['cancao original'],
  'melhor filme internacional': ['filme internacional'],
};

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

  // Mapa de categorias do banco
  const catMap = new Map<string, { id: string; name: string }>();
  for (const c of categories ?? []) {
    catMap.set(normalize(c.name), { id: c.id, name: c.name });
  }

  // Scrape de cada fonte e consolidação por categoria
  const urls = sources.map((s) => s.url);
  const { items, processed, skipped } = await scrapeOmeleteArticles(urls);

  // Log categorias detectadas
  const countsByCategorySite = new Map<string, number>();
  for (const it of items) {
    const key = normalize(it.category);
    countsByCategorySite.set(key, (countsByCategorySite.get(key) ?? 0) + 1);
  }
  console.info('[scrape] categories detected from site:', Array.from(countsByCategorySite.entries()));

  // Filtro opcional por categoryId
  let filtered = items;
  if (categoryId) {
    // pega o nome da categoria selecionada e filtra por label equivalente
    const selected = (categories ?? []).find((c) => c.id === categoryId);
    if (!selected) return { ok: false, error: 'Selected category not found' };
    const selectedKey = normalize(selected.name);
    filtered = filtered.filter((it) => {
      const siteKey = normalize(it.category);
      if (siteKey === selectedKey) return true;
      const syns = CATEGORY_SYNONYMS[selectedKey] ?? [];
      return syns.includes(siteKey);
    });
  }

  // Agrupar por categoria do banco (considerando sinônimos)
  const groups = new Map<string, { names: string[]; metas: Record<string, any>[] }>();

  for (const it of filtered) {
    const siteKey = normalize(it.category);
    // Match direto
    if (catMap.has(siteKey)) {
      const cat = catMap.get(siteKey)!;
      const list = groups.get(cat.id) ?? [];
      list.push(it.name.trim());
      groups.set(cat.id, list);
      continue;
    }
    // Match por sinônimo
    let matchedId: string | null = null;

    // Match direto ou por sinônimo
    if (catMap.has(siteKey)) {
      matchedId = catMap.get(siteKey)!.id;
    } else {
      for (const [dbKey, cat] of catMap.entries()) {
        const syns = CATEGORY_SYNONYMS[dbKey] ?? [];
        if (siteKey === dbKey || syns.includes(siteKey)) {
          matchedId = cat.id;
          break;
        }
      }
    }

    if (matchedId) {
      const entry = groups.get(matchedId) ?? { names: [], metas: [] };
      entry.names.push(it.name.trim());
      entry.metas.push(it.meta ?? {});
      groups.set(matchedId, entry);
    }
  }

  const summary: Array<{ category: string; category_id?: string; imported: number }> = [];
  let totalImported = 0;

  for (const [catId, group] of groups) {
    const cat = (categories ?? []).find(c => c.id === catId);
    if (!cat) {
      summary.push({ category: catId, imported: 0 });
      continue;
    }

    // Ler nominees existentes para deduplicação
    const { data: existing } = await supabase
      .from('nominees')
      .select('id, name')
      .eq('category_id', cat.id);

    const existingSet = new Set((existing ?? []).map(n => normalize(n.name)));
    const toInsert: Array<{ name: string; category_id: string; meta?: Record<string, any> }> = [];

    for (let i = 0; i < group.names.length; i++) {
      const name = group.names[i];
      const meta = group.metas[i] || {};
      const norm = normalize(name);
      if (!existingSet.has(norm)) {
        // Se houver film_title, guarda em meta
        const insertObj: { name: string; category_id: string; meta?: Record<string, any> } = {
          name: name.trim(),
          category_id: cat.id,
        };
        if (meta && typeof meta === 'object' && Object.keys(meta).length > 0) {
          insertObj.meta = meta;
        }
        toInsert.push(insertObj);
        existingSet.add(norm);
      }
    }

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase.from('nominees').insert(toInsert);
      if (insErr) {
        console.error('[scrape] insert error for category', cat.name, insErr.message);
        summary.push({ category: cat.name, category_id: cat.id, imported: 0 });
        continue;
      }
      totalImported += toInsert.length;
    }

    summary.push({ category: cat.name, category_id: cat.id, imported: toInsert.length });
    // Revalidar páginas relacionadas
    revalidatePath(`/admin/nominees/${cat.id}`);
  }

  revalidatePath('/ranking');

  return {
    ok: true,
    data: {
      totalImported,
      summary,
      processed,
      skipped,
      detectedCategories: Array.from(countsByCategorySite.entries()),
    },
  };
}