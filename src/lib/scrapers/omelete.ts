import * as cheerio from 'cheerio';
import { logger } from '@/lib/logger';

export type ScrapedNominee = {
  category: string;     // ex.: "Melhor Filme"
  name: string;         // ex.: "Oppenheimer"
  sourceUrl: string;    // URL do artigo do Omelete
  meta?: { film_title?: string };
};

export type ScrapeReport = {
  items: ScrapedNominee[];
  processed: string[];                          // URLs processadas com sucesso
  skipped: Array<{ url: string; reason: string }>; // URLs ignoradas e motivo
};

const CATEGORY_PATTERNS_PT: Array<{ label: string; re: RegExp }> = [
  { label: 'Melhor Atriz Coadjuvante', re: /\bmelhor atriz coadjuvante\b/i },
  { label: 'Melhor Ator Coadjuvante', re: /\bmelhor ator coadjuvante\b/i },
  { label: 'Melhor Filme Internacional', re: /\bmelhor filme internacional\b/i },
  { label: 'Melhor Filme de Animação', re: /\bmelhor (filme de )?anima(ç|c)ão\b/i },
  { label: 'Melhor Documentário em Curta', re: /\bmelhor document(á|a)rio em curta\b/i },
  { label: 'Melhor Curta de Animação', re: /\bmelhor curta (de )?anima(ç|c)ão\b/i },
  { label: 'Melhor Curta Live Action', re: /\bmelhor curta (live action|de fic(ç|c)ão)\b/i },
  { label: 'Melhor Maquiagem e Penteado', re: /\bmelhor maqui(a|e)gem( e)? penteado\b/i },
  { label: 'Melhor Design de Produção', re: /\bmelhor design de produ(ç|c)ão\b/i },
  { label: 'Melhor Atriz', re: /\bmelhor atriz\b/i },
  { label: 'Melhor Ator', re: /\bmelhor ator\b/i },
  { label: 'Melhor Diretor', re: /\bmelhor diretor\b/i },
  { label: 'Melhor Roteiro Original', re: /\bmelhor roteiro original\b/i },
  { label: 'Melhor Roteiro Adaptado', re: /\bmelhor roteiro adaptado\b/i },
  { label: 'Melhor Trilha Sonora', re: /\bmelhor trilha sonora\b/i },
  { label: 'Melhor Fotografia', re: /\bmelhor fotografia\b/i },
  { label: 'Melhor Edição', re: /\bmelhor edi(c|ç)ão\b/i },
  { label: 'Melhor Montagem', re: /\bmelhor montagem\b/i },
  { label: 'Melhor Figurino', re: /\bmelhor figurino\b/i },
  { label: 'Melhor Som', re: /\bmelhor som\b/i },
  { label: 'Melhor Filme', re: /\bmelhor filme\b(?!\s+internacional)/i },
  { label: 'Melhor Documentário', re: /\bmelhor document(á|a)rio\b/i },
];

const HEADINGS_SEL = 'h2, h3, h4, strong, b';

// Utilidades
function normalizeText(s: string): string {
  return (s || '').replace(/\s+/g, ' ').trim();
}

function isProbableNomineeName(s: string): boolean {
  const t = normalizeText(s);
  if (t.length < 2 || t.length > 120) return false;
  // evitar frases gerais e termos não-nome
  const bad = [
    /oscar\s+20\d{2}/i,
    /\b(lista|completa|confira|indicados|vencedores|premi(ac|ç)ão|premiação)\b/i,
    /leia nossa crítica/i,
    /nossa crítica/i,
    /\bcrítica\b/i,
  ];
  if (bad.some(re => re.test(t))) return false;

  // deve conter letras e não ser cheio de pontuação
  const letters = t.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g)?.length ?? 0;
  const punct = t.match(/[.,;:!?]/g)?.length ?? 0;
  if (letters < 2) return false;
  if (punct > 8) return false;

  // remove bullets/traços simples e valida
  const cleaned = t.replace(/^[•\-–—]\s*/, '');
  return cleaned.length >= 2;
}

// Extrai “nome” do texto de <li> removendo sufixos (“ – ”, “ - ”, “(…)”)
function extractNameFromLiText(raw: string): string {
  let t = normalizeText(raw).replace(/^[•\-–—]\s*/, '');
  // corta antes de " – ", " - ", ":" ou "("
  const cutIdx = [' – ', ' - ', ':', ' ('].reduce((acc, mark) => {
    const i = t.indexOf(mark);
    return acc === -1 || (i !== -1 && i < acc) ? i : acc;
  }, -1);
  if (cutIdx !== -1) t = t.slice(0, cutIdx).trim();
  return t;
}

// Extrai “name” e “film_title” de um nó <li> ou texto de bullet

function parseLiNodeWithCategory(
  $: cheerio.CheerioAPI,
  li: cheerio.Element,
  categoryLabel: string
): { name?: string; film_title?: string } {
  const anchorOrStrong = $(li).find('a, strong, b').first();
  let baseText = normalizeText(anchorOrStrong.length ? anchorOrStrong.text() : $(li).text());

  // 1) Sanitização
  // Remover bullets no início
  baseText = baseText.replace(/^[•\-–—]\s*/, '');

  // Remove qualquer parêntese que contenha a palavra "crítica"
  // Ex.: "(Leia nossa crítica)" ou variações
  baseText = baseText.replace(/\([^)]*crítica[^)]*\)/gi, '').trim();
  // Remover sufixo " - Leia nossa crítica" ou variações com dash
  baseText = baseText.replace(/\s*(?:–|—|-)\s*Leia nossa crítica/gi, '').trim();
  // Normalizar NBSP para espaço e dashes para hífen simples
  baseText = baseText.replace(/\u00A0/g, ' ').replace(/[–—]/g, '-');
  // Colapsar espaços múltiplos
  baseText = baseText.replace(/\s+/g, ' ').trim();

  // Filtro de ruído após sanitização
  if (/leia nossa crítica/i.test(baseText) || /\bcrítica\b/i.test(baseText)) {
    return {};
  }

  // Música: "Título" - Filme
  const quotedSong = baseText.match(/^"(.+?)"\s*(?:–|—|-)\s*(.+)$/);
  if (quotedSong) {
    const parsed = {
      name: cleanName(quotedSong[1]),
      film_title: cleanFilm(quotedSong[2]),
    };
    logger.debug('parseLiNode(song)', { baseText, parsed });
    return parsed;
  }

  // Se houver <em>/<i> com o título do filme
  const em = $(li).find('em, i').first();
  const emText = em.length ? normalizeText(em.text()) : '';
  if (em.length && emText.length >= 2 && !/crítica/i.test(emText)) {
    const film = emText;
    const nameOnly = normalizeText(baseText.replace(film, '')).replace(/[()]/g, '').trim();
    const parsed = {
      name: cleanName(nameOnly),
      film_title: cleanFilm(film),
    };
    logger.debug('parseLiNode(em/i)', { baseText, parsed });
    return parsed;
  }

  // // Definição ampla de separadores (– em dash, — em dash, - hyphen, : colon)
  // const sepPattern = /(?:–|—|-|:)/;

  // // Atuação: tentar separar por "Nome SEP Filme"
  if (isActingCategory(categoryLabel)) {
    // split por primeiro hífen/colon após normalização
    const m = baseText.match(/^(.+?)\s*-\s*(.+)$/) || baseText.match(/^(.+?)\s*:\s*(.+)$/);
    if (m) {
      const parsed = {
        name: cleanName(m[1]),
        film_title: cleanFilm(m[2]),
      };
      logger.debug('parseLiNode(acting sep)', { baseText, parsed });
      return parsed;
    }
    // Padrão "Nome (Filme)"
    const paren = baseText.match(/^(.+?)\s*\((.+?)\)$/);
    if (paren) {
      const parsed = {
        name: cleanName(paren[1]),
        film_title: cleanFilm(paren[2]),
      };
      logger.debug('parseLiNode(acting paren)', { baseText, parsed });
      return parsed;
    }
    const parsed = { name: cleanName(baseText) };
    logger.debug('parseLiNode(acting fallback)', { baseText, parsed });
    return parsed;
  }

  // Categorias de filme/obra: manter título completo como name (não dividir)
  if (isFilmWorkCategory(categoryLabel)) {
    // Remover aspas e normalizar
    let filmOnly = baseText.replace(/[“”"']/g, '').trim();
    const parsed = { name: cleanName(filmOnly) };
    logger.debug('parseLiNode(non-acting)', { baseText, parsed });
    return parsed;
  }

  // 6) Fallback genérico
  const m = baseText.match(/^(.+?)\s*-\s*(.+)$/) || baseText.match(/^(.+?)\s*:\s*(.+)$/);
  if (m) {
    const parsed = {
      name: cleanName(m[1]),
      film_title: cleanFilm(m[2]),
    };
    logger.debug('parseLiNode(generic sep)', { baseText, parsed });
    return parsed;
  }
  const paren = baseText.match(/^(.+?)\s*\((.+?)\)$/);
  if (paren) {
    const parsed = {
      name: cleanName(paren[1]),
      film_title: cleanFilm(paren[2]),
    };
    logger.debug('parseLiNode(generic paren)', { baseText, parsed });
    return parsed;
  }

  const parsed = { name: cleanName(baseText) };
  logger.debug('parseLiNode(generic fallback)', { baseText, parsed });
  return parsed;
}

// Retorna o label da categoria mais específica que casa com o heading
function findCategoryLabel(headingText: string): string | null {
  const text = normalizeText(headingText);
  // Ordena padrões por label mais longo (maior especificidade)
  const ordered = [...CATEGORY_PATTERNS_PT].sort((a, b) => b.label.length - a.label.length);
  for (const cat of ordered) {
    if (cat.re.test(text)) return cat.label;
  }
  return null;
}

// Determina se categoria é de atuação (ator/atriz/coadjuvante)
function isActingCategory(label: string): boolean {
  const l = normalizeText(label).toLowerCase();
  return (
    l.includes('melhor ator') ||
    l.includes('melhor atriz') ||
    l.includes('coadjuvante')
  );
}
// Categoria onde os itens são filmes/obras (não dividir por “:” ou “ – ”)
function isFilmWorkCategory(label: string): boolean {
  const l = normalizeText(label).toLowerCase();
  return (
    l.includes('roteiro') ||
    l.includes('fotografia') ||
    l.includes('montagem') ||
    l.includes('figurino') ||
    l.includes('maquiagem') ||
    l.includes('design de producao') ||
    l.includes('som') ||
    l.includes('trilha sonora') ||
    l.includes('filme de animacao') ||
    l.includes('documentario') ||
    l.includes('filme internacional') ||
    l.includes('melhor filme') // inclui Melhor Filme
  );
}

function cleanName(s?: string): string | undefined {
  if (!s) return undefined;
  // Remove sufixos comuns e excesso de pontuação
  let t = normalizeText(s);
  t = t.replace(/[“”"']/g, '').trim();
  return t.length >= 2 ? t : undefined;
}

function cleanFilm(s?: string): string | undefined {
  if (!s) return undefined;
  let t = normalizeText(s);
  // Remove prefixos genéricos como "do filme", "do longa", etc.
  t = t.replace(/^(do|da|de)\s+(filme|longa|obra)\s+/i, '').trim();
  // Remover aspas e pontuação excessiva
  t = t.replace(/[“”"']/g, '').trim();
  return t.length >= 1 ? t : undefined;
}

// Seletores específicos para artigos “Lista completa”
// Estratégia: localizar heading com nome da categoria e coletar as <li> subsequentes
function parseArticleWithSelectors($: cheerio.CheerioAPI, sourceUrl: string): ScrapedNominee[] {
  const items: ScrapedNominee[] = [];

  // Em muitos artigos do Omelete, o conteúdo principal está em containers como:
  // .article-body, .content-body, main, ou diretamente sob o body
  const root = $('article, .article-body, .content-body, main, body').first();
  if (!root || root.length === 0) {
    logger.warn('parseArticleWithSelectors: no root', { sourceUrl });
    return items;
  }

  logger.info('parseArticleWithSelectors: start', { sourceUrl });

  // 1) Headings que definem categoria e listas subsequentes
  root.find(HEADINGS_SEL).each((_i, el) => {
    const headingText = normalizeText($(el).text());
    if (!headingText) return;

    const category = findCategoryLabel(headingText);
    if (!category) return;
    logger.info('heading matched category', { headingText, category });

    // Região: todos os irmãos até próximo heading
    const region = $(el).nextUntil(HEADINGS_SEL);

    // Listas próximas (<ul>/<ol>)
    const closeList = $(el).nextAll('ul, ol').first();

    // Colete items de <li> em region e listas próximas
    const listsSel = region.add(closeList)
      .find('ul > li, ol > li')
      .add(region.filter('ul > li, ol > li'));

    logger.debug('listsSel count', { count: listsSel.length });

    // <li> de listas
    listsSel.each((_j, li) => {
      const parsed = parseLiNodeWithCategory($, li, category);
      logger.debug('li parsed', { category, parsed });
      if (parsed.name && isProbableNomineeName(parsed.name)) {
        items.push({
          category,
          name: parsed.name,
          sourceUrl,
          meta: parsed.film_title ? { film_title: parsed.film_title } : undefined,
        });
      }
    });

    // bullets em <p>

    // 1b) Fallback: parágrafos com bullets
    region.find('p').each((_j, p) => {
      const raw = normalizeText($(p).text());
      if (/^[•\-–—]\s*/.test(raw)) {
        try {
          const $liCtx = cheerio.load(`<li>${raw}</li>`);
          const liEl = $liCtx('li')[0];
          if (!liEl) return;
          const parsed = parseLiNodeWithCategory($, liEl, category);
          logger.debug('p bullet parsed', { category, parsed });
          if (parsed.name && isProbableNomineeName(parsed.name)) {
            items.push({
              category,
              name: parsed.name,
              sourceUrl,
              meta: parsed.film_title ? { film_title: parsed.film_title } : undefined,
            });
          }
        } catch (err: any) {
          logger.warn('bullet parse error', { err: err?.message });
        }
      }
    });

    // 1c) Fallback: elementos com role=listitem (acessibilidade)
    region.find('[role="listitem"]').each((_j, li) => {
      const parsed = parseLiNodeWithCategory($, li, category);
      logger.debug('aria listitem parsed', { category, parsed });
      if (parsed.name && isProbableNomineeName(parsed.name)) {
        items.push({
          category,
          name: parsed.name,
          sourceUrl,
          meta: parsed.film_title ? { film_title: parsed.film_title } : undefined,
        });
      }
    });
  });

  logger.info('parseArticleWithSelectors: done', { sourceUrl, extracted: items.length });

  // 2) Fallback global: quando não há headings “categoria”, tentar listas globais
  if (items.length === 0) {
    root.find('ul > li, ol > li').each((_j, li) => {
      const parsed = parseLiNodeWithCategory($, li, 'Indefinida');
      if (parsed.name && isProbableNomineeName(parsed.name)) {
        items.push({
          category: 'Indefinida',
          name: parsed.name,
          sourceUrl,
          meta: parsed.film_title ? { film_title: parsed.film_title } : undefined,
        });
      }
    });
  }

  return dedupeNominees(items);
}

async function fetchWithRetry(url: string, init: RequestInit, retries = 1) {
  try {
    return await fetch(url, init);
  } catch (err: any) {
    if (retries > 0 && (err?.code === 'ECONNRESET' || err?.message === 'aborted')) {
      await new Promise(r => setTimeout(r, 300));
      return fetchWithRetry(url, init, retries - 1);
    }
    throw err;
  }
}

// Scraper principal
export async function scrapeOmeleteArticles(urls: string[]): Promise<ScrapeReport> {
  const processed: string[] = [];
  const skipped: Array<{ url: string; reason: string }> = [];
  const items: ScrapedNominee[] = [];

  for (const url of urls) {
    try {
      logger.info('scrape: fetch start', { url });
      const resp = await fetchWithRetry(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OscarBot/1.0; +https://github.com/gavital/oscar-betting-app)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        cache: 'no-store',
      }, 1);


      if (!resp.ok) {
        logger.warn('scrape: HTTP not OK', { url, status: resp.status });
        skipped.push({ url, reason: `HTTP ${resp.status}` });
        continue;
      }

      const html = await resp.text();
      const $ = cheerio.load(html);

      // Primeiro tenta seletores específicos para “Lista completa”
      const extractedSel = parseArticleWithSelectors($, url);
      let extracted = extractedSel;

      // Fallback extra: heurística anterior baseada em blocos “indicados”
      if (extractedSel.length === 0) {
        logger.warn('scrape: selectors yielded 0, using heuristic fallback', { url });
        extracted = parseArticleHeuristic($, url);
      }

      if (extracted.length > 0) {
        logger.info('scrape: page extracted items', { url, count: extracted.length });
        items.push(...extracted);
      } else {
        logger.warn('scrape: no items extracted for page', { url });
      }

      processed.push(url);
    } catch (err: any) {
      logger.error('scrape: fetch error', { url, error: err?.message ?? 'network_error' });
      skipped.push({ url, reason: err?.message ?? 'network_error' });
    }
  }

  const result = { items: dedupeNominees(items), processed, skipped };
  logger.info('scrape: finished', {
    processed: result.processed.length,
    skipped: result.skipped.length,
    items: result.items.length,
  });

  return result;
}

function dedupeNominees(items: ScrapedNominee[]): ScrapedNominee[] {
  const seen = new Set<string>();
  const out: ScrapedNominee[] = [];
  for (const it of items) {
    // chave: categoria + nome (case-insensitive, trimmed)
    const key =
      (it.category ?? '').toLowerCase().trim() +
      '::' +
      (it.name ?? '').toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

// Heurística (mantida como fallback)
function parseArticleHeuristic($: cheerio.CheerioAPI, sourceUrl: string): ScrapedNominee[] {
  const textBlocks: string[] = [];
  $('h2, h3, p, li').each((_i, el) => {
    const t = normalizeText($(el).text() || '');
    if (t.length >= 8) textBlocks.push(t);
  });

  const out: ScrapedNominee[] = [];
  for (let i = 0; i < textBlocks.length; i++) {
    const block = textBlocks[i];
    if (!/\bindicados?\b/i.test(block)) continue;

    let categoryLabel: string | null = null;
    for (const cat of CATEGORY_PATTERNS_PT) {
      if (cat.re.test(block)) { categoryLabel = cat.label; break; }
    }
    if (!categoryLabel && i > 0) {
      const prev = textBlocks[i - 1];
      for (const cat of CATEGORY_PATTERNS_PT) {
        if (cat.re.test(prev)) { categoryLabel = cat.label; break; }
      }
    }
    if (!categoryLabel && i < textBlocks.length - 1) {
      const next = textBlocks[i + 1];
      for (const cat of CATEGORY_PATTERNS_PT) {
        if (cat.re.test(next)) { categoryLabel = cat.label; break; }
      }
    }
    if (!categoryLabel) continue;

    const names = extractNamesFromHeuristicBlock(block);
    for (const name of names) {
      if (isProbableNomineeName(name)) {
        out.push({ category: categoryLabel, name, sourceUrl });
      }
    }
  }

  return dedupeNominees(out);
}

function extractNamesFromHeuristicBlock(block: string): string[] {
  let slice = normalizeText(block).replace(/[–—:]/g, ':');
  const idx = slice.toLowerCase().indexOf('indicados');
  if (idx >= 0) slice = slice.slice(idx + 'indicados'.length);
  const commaSplit = slice.split(',').map(s => extractNameFromLiText(s)).filter(Boolean);
  if (commaSplit.length >= 2) return commaSplit;
  const lineSplit = slice.split(/\n|•|-|\u2022/).map(s => extractNameFromLiText(s)).filter(Boolean);
  if (lineSplit.length >= 2) return lineSplit;
  return [];
}

// Descoberta dinâmica de URLs por ano
export async function discoverOmeleteArticleUrlsByYear(
  year: number,
  options: { maxPages?: number } = {}
): Promise<string[]> {
  const maxPages = options.maxPages ?? 5;
  const base = `https://www.omelete.com.br/oscar-${year}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; OscarBot/1.0; +https://github.com/gavital/oscar-betting-app)',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  };

  const urls = new Set<string>();
  const articleRe = new RegExp(`/oscar-${year}/[a-z0-9-]+`, 'i');

  // varre página base e paginação simples ?page=2..N
  for (let page = 1; page <= maxPages; page++) {
    const pageUrl = page === 1 ? base : `${base}?page=${page}`;
    try {
      const resp = await fetch(pageUrl, { headers, cache: 'no-store' });
      if (!resp.ok) {
        console.warn(`[discover][omelete] ${pageUrl} -> HTTP ${resp.status}`);
        continue;
      }
      const html = await resp.text();
      const $ = cheerio.load(html);

      // Anchors para artigos dentro de /oscar-{year}/slug
      $('a[href]').each((_i, el) => {
        const href = ($(el).attr('href') || '').trim();
        if (!href) return;

        // normaliza URL absoluta
        const full = normalizeOmeleteUrl(href);
        if (!full) return;

        // filtra por padrão do ano
        if (articleRe.test(full)) {
          urls.add(full);
        }
      });

      // se a página não tem paginação (ou pouco conteúdo), podemos encerrar cedo
      if ($('a[href*="?page="]').length === 0 && page > 1) {
        break;
      }
    } catch (err: any) {
      console.warn(`[discover][omelete] ${pageUrl} -> ${err?.message ?? 'network_error'}`);
    }
  }

  return Array.from(urls);
}

function normalizeOmeleteUrl(href: string): string | null {
  // transforma links relativos em absolutos e garante https
  try {
    let url = href;
    if (href.startsWith('/')) {
      url = `https://www.omelete.com.br${href}`;
    }
    const u = new URL(url);
    if (u.protocol === 'http:') u.protocol = 'https:';
    return u.toString();
  } catch {
    return null;
  }
}