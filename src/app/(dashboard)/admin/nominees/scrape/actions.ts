// src/app/(dashboard)/admin/nominees/scrape/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { scrapeOmeleteArticles } from '@/lib/scrapers/omelete';
import { logger } from '@/lib/logger';

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
  'melhor maquiagem e penteado': ['maquiagem e penteados', 'maquiagem'],
  'melhor trilha sonora': ['trilha sonora original'],
  'melhor cancao original': ['cancao original'],
  'melhor filme internacional': ['filme internacional'],
  'melhor figurino': ['figurino'],
  'melhor som': ['som'],
};

type GroupEntry = { names: string[]; metas: Record<string, any>[] };

export async function importFromGlobalScrape({ categoryId }: { categoryId?: string }) {
  const adminCheck = await requireAdmin();
  if (!adminCheck?.supabase) return { ok: false, error: 'Unauthorized' };
  const { supabase } = adminCheck;

  logger.info('importFromGlobalScrape: start', { categoryId });

  const { data: sources, error: srcErr } = await supabase
    .from('scrape_sources')
    .select('url, enabled, source_name, language')
    .eq('enabled', true);

  if (srcErr) {
    logger.error('sources load error', { error: srcErr.message });
    return { ok: false, error: srcErr.message };
  }
  logger.info('sources', { count: sources?.length ?? 0, urls: (sources ?? []).map(s => s.url) });

  if (!sources || sources.length === 0) {
    return { ok: false, error: 'No global scrape sources configured' };
  }

  // Ler categorias para mapear labels -> category_id
  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .select('id, name, is_active');

  if (catErr) {
    logger.error('categories load error', { error: catErr.message });
    return { ok: false, error: catErr.message };
  }
  logger.info('categories loaded', { count: categories?.length ?? 0 });

  // Descobre ano corrente da edição
  const { data: yearSetting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'ceremony_year')
    .maybeSingle();
  const currentYear = Number(yearSetting?.value) || new Date().getFullYear();

  // Mapa de categorias: chave normalizada -> { id, name, ceremony_year }
  const catMap = new Map<string, { id: string; name: string; ceremony_year: number }>();
  for (const c of categories ?? []) {
    catMap.set(normalize(c.name), { id: c.id, name: c.name, ceremony_year: currentYear });
  }

  async function resolveOrCreateCategory(siteLabelRaw: string): Promise<{ id: string; name: string } | null> {
    const siteLabelNorm = normalize(siteLabelRaw);

    // 1) Cache + validação de ano
    const cached = catMap.get(siteLabelNorm);
    if (cached) {
      const { data: onDb } = await supabase
        .from('categories')
        .select('id, name, ceremony_year')
        .eq('id', cached.id)
        .maybeSingle();
      if (onDb?.ceremony_year === currentYear) return { id: onDb.id, name: onDb.name };
    }

    // 2) Match por nome + ano
    const { data: existingCat } = await supabase
      .from('categories')
      .select('id, name')
      .eq('ceremony_year', currentYear)
      .ilike('name', siteLabelRaw)
      .maybeSingle();
    if (existingCat?.id) {
      catMap.set(siteLabelNorm, { id: existingCat.id, name: existingCat.name, ceremony_year: currentYear });
      return { id: existingCat.id, name: existingCat.name };
    }

    // 3) Sinônimos (se nome diferente)
    for (const [dbKey, cachedCat] of catMap.entries()) {
      const syns = CATEGORY_SYNONYMS[dbKey] ?? [];
      if (siteLabelNorm === dbKey || syns.includes(siteLabelNorm)) {
        const { data: onDb } = await supabase
          .from('categories')
          .select('id, name, ceremony_year')
          .eq('id', cachedCat.id)
          .maybeSingle();
        if (onDb?.ceremony_year === currentYear) return { id: onDb.id, name: onDb.name };
      }
    }

    // 4) Criar nova categoria para o ano corrente
    const nameToCreate = siteLabelRaw.trim();
    const { data: inserted, error: insCatErr } = await supabase
      .from('categories')
      .insert({ name: nameToCreate, is_active: true, ceremony_year: currentYear, max_nominees: 5 })
      .select('id, name')
      .maybeSingle();

    if (insCatErr) {
      logger.error('category upsert error', { label: siteLabelRaw, error: insCatErr.message });
      return null;
    }

    if (inserted?.id) {
      catMap.set(siteLabelNorm, { id: inserted.id, name: inserted.name, ceremony_year: currentYear });
      return { id: inserted.id, name: inserted.name };
    }

    return null;
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
  logger.info('site categories detected', Array.from(countsByCategorySite.entries()));

  console.info('[scrape] categories detected from site:', Array.from(countsByCategorySite.entries()));

  // Filtro opcional por categoria selecionada
  let filtered = items;
  if (categoryId) {
    // pega o nome da categoria selecionada e filtra por label equivalente
    const selected = (categories ?? []).find((c) => c.id === categoryId);
    if (!selected) {
      logger.error('selected category not found', { categoryId });
      return { ok: false, error: 'Selected category not found' };
    }
    const selectedKey = normalize(selected.name);

    filtered = filtered.filter((it) => {
      const siteKey = normalize(it.category);
      const syns = CATEGORY_SYNONYMS[selectedKey] ?? [];
      const matched = siteKey === selectedKey || syns.includes(siteKey);
      if (!matched) {
        logger.debug('filter skip item', { selectedKey, siteKey, name: it.name });
      }
      return matched;
    });
    logger.info('filtered by category', { selectedKey, filteredCount: filtered.length });
  }

  // Sanitização e filtro de ruído (reforçado)
  {
    const beforeCount = filtered.length;

    filtered = filtered
      .map((it) => {
        // Remove qualquer parêntese contendo “crítica” e normaliza espaços/dashes
        const cleanName = (it.name ?? '')
          .replace(/\([^)]*crítica[^)]*\)/gi, '') // remove (…crítica…)
          .replace(/\(\s*\)/g, '')      // remove "()"
          .replace(/\u00A0/g, ' ')                // NBSP -> espaço
          .replace(/[–—]/g, '-')                  // dashes -> hífen
          .replace(/[“”"']/g, '')
          .replace(/\s+/g, ' ')                   // colapsa espaços
          .trim();

        let film = (it.meta as any)?.film_title ?? '';
        film = film
          .replace(/\([^)]*crítica[^)]*\)/gi, '')
          .replace(/\(\s*\)/g, '')
          .replace(/\u00A0/g, ' ')
          .replace(/[–—]/g, '-')
          .replace(/[“”"’']/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        const cleanMeta = film ? { film_title: film } : {};

        return { ...it, name: cleanName, meta: cleanMeta };
      })
      .filter(
        (it) =>
          it.name.length > 0 &&
          !/leia nossa crítica/i.test(it.name) &&
          !/\bcrítica\b/i.test(it.name)
      );

    logger.info('noise filter applied', {
      beforeCount,
      afterCount: filtered.length,
    });
  }

  // Agrupar por categoria (criando se necessário)
  const groups = new Map<string, GroupEntry>();

  for (const it of filtered) {
    const resolved = await resolveOrCreateCategory(it.category);
    if (!resolved) {
      logger.warn('unresolved category', { siteKey: normalize(it.category), name: it.name });
      continue;
    }
    const entry = groups.get(resolved.id) ?? { names: [], metas: [] };
    entry.names.push(it.name.trim());
    entry.metas.push(it.meta ?? {});
    groups.set(resolved.id, entry);
  }

  logger.info(
    'grouping summary',
    Array.from(groups.entries()).map(([catId, g]) => ({
      catId,
      names: g.names.length,
      metas: g.metas.length,
    }))
  );

  // Inserção por categoria (com ceremony_year)
  const summary: Array<{ category: string; category_id?: string; imported: number }> = [];
  let totalImported = 0;

  for (const [catId, group] of groups) {
    const cat = (categories ?? []).find(c => c.id === catId) || { id: catId, name: (Array.from(catMap.values()).find(v => v.id === catId)?.name ?? 'Unknown') };

    const names = Array.isArray(group?.names) ? group.names : [];
    const metas = Array.isArray(group?.metas) ? group.metas : [];
    logger.info('prepare insert', { category: cat.name, namesCount: names.length });

    if (names.length === 0) {
      summary.push({ category: cat.name, category_id: cat.id, imported: 0 });
      continue;
    }

    // Ler nominees existentes para deduplicação
    const { data: existing } = await supabase
      .from('nominees')
      .select('id, name')
      .eq('category_id', cat.id)
      .eq('ceremony_year', currentYear);

    const existingSet = new Set((existing ?? []).map(n => normalize(n.name)));
    const toInsert: Array<{ name: string; category_id: string; meta: Record<string, any>; ceremony_year: number }> = [];

    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const meta = metas[i] || {};

      const norm = normalize(name);
      if (!existingSet.has(norm)) {
        const insertObj = {
          name: name.trim(),
          category_id: cat.id,
          meta: (meta && typeof meta === 'object') ? { ...meta } : {},
          ceremony_year: currentYear,
        };
        toInsert.push(insertObj);
        existingSet.add(norm);
      } else {
        logger.debug('duplicate skip', { category: cat.name, name });
      }
    }

    logger.info('insert batch', { category: cat.name, toInsertCount: toInsert.length, sample: toInsert.slice(0, 3) });

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase.from('nominees').insert(toInsert);
      if (insErr) {
        logger.error('insert error', { category: cat.name, error: insErr.message });
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

  logger.info('import done', { totalImported, processed: processed.length, skipped: skipped.length });

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