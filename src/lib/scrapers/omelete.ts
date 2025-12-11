import * as cheerio from 'cheerio';

export type ScrapedNominee = {
  category: string;     // ex.: "Melhor Filme"
  name: string;         // ex.: "Oppenheimer"
  sourceUrl: string;    // URL do artigo do Omelete
};

export type ScrapeReport = {
  items: ScrapedNominee[];
  processed: string[];                          // URLs processadas com sucesso
  skipped: Array<{ url: string; reason: string }>; // URLs ignoradas e motivo
};

const CATEGORY_PATTERNS_PT: Array<{ label: string; re: RegExp }> = [
  { label: 'Melhor Filme', re: /\bmelhor filme\b/i },
  { label: 'Melhor Diretor', re: /\bmelhor diretor\b/i },
  { label: 'Melhor Ator', re: /\bmelhor ator\b/i },
  { label: 'Melhor Atriz', re: /\bmelhor atriz\b/i },
  { label: 'Melhor Ator Coadjuvante', re: /\bmelhor ator coadjuvante\b/i },
  { label: 'Melhor Atriz Coadjuvante', re: /\bmelhor atriz coadjuvante\b/i },
  { label: 'Melhor Filme de Animação', re: /\bmelhor (filme de )?anima(ç|c)ão\b/i },
  { label: 'Melhor Documentário', re: /\bmelhor document(á|a)rio\b/i },
  { label: 'Melhor Documentário em Curta', re: /\bmelhor document(á|a)rio em curta\b/i },
  { label: 'Melhor Curta de Animação', re: /\bmelhor curta (de )?anima(ç|c)ão\b/i },
  { label: 'Melhor Curta Live Action', re: /\bmelhor curta (live action|de fic(ç|c)ão)\b/i },
  { label: 'Melhor Roteiro Original', re: /\bmelhor roteiro original\b/i },
  { label: 'Melhor Roteiro Adaptado', re: /\bmelhor roteiro adaptado\b/i },
  { label: 'Melhor Fotografia', re: /\bmelhor fotografia\b/i },
  { label: 'Melhor Edição', re: /\bmelhor edi(c|ç)ão\b/i },
  { label: 'Melhor Montagem', re: /\bmelhor montagem\b/i },
  { label: 'Melhor Som', re: /\bmelhor som\b/i },
  { label: 'Melhor Figurino', re: /\bmelhor figurino\b/i },
  { label: 'Melhor Maquiagem e Penteado', re: /\bmelhor maqui(a|e)gem( e)? penteado\b/i },
  { label: 'Melhor Design de Produção', re: /\bmelhor design de produ(ç|c)ão\b/i },
  { label: 'Melhor Trilha Sonora', re: /\bmelhor trilha sonora\b/i },
  { label: 'Melhor Canção Original', re: /\bmelhor can(ç|c)ão original\b/i },
  { label: 'Melhor Filme Internacional', re: /\bmelhor filme internacional\b/i },
  // adicione outras conforme necessário
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
  const cutIdx = [ ' – ', ' - ', ':', ' (' ].reduce((acc, mark) => {
    const i = t.indexOf(mark);
    return acc === -1 || (i !== -1 && i < acc) ? i : acc;
  }, -1);
  if (cutIdx !== -1) t = t.slice(0, cutIdx).trim();
  return t;
}

// Seletores específicos para artigos “Lista completa”
// Estratégia: localizar heading com nome da categoria e coletar as <li> subsequentes
function parseArticleWithSelectors($: cheerio.CheerioAPI, sourceUrl: string): ScrapedNominee[] {
  const items: ScrapedNominee[] = [];

  // Em muitos artigos do Omelete, o conteúdo principal está em containers como:
  // .article-body, .content-body, main, ou diretamente sob o body
  const root = $('article, .article-body, .content-body, main, body').first();
  if (!root || root.length === 0) return items;

  // 1) Headings que definem categoria e listas subsequentes
  root.find(HEADINGS_SEL).each((_i, el) => {
    const headingText = normalizeText($(el).text());
    if (!headingText) return;

    const categoryMatch = CATEGORY_PATTERNS_PT.find(cat => cat.re.test(headingText));
    if (!categoryMatch) return;
    const category = categoryMatch.label;

    // Região: todos os irmãos até próximo heading
    const region = $(el).nextUntil(HEADINGS_SEL);

    // Preferir listas explícitas próximas
    const closeList = $(el).nextAll('ul, ol').first();
    const lists = region.add(closeList).find('ul > li, ol > li').add(region.filter('ul > li, ol > li'));
    lists.each((_j, li) => {
      const anchor = $(li).find('a, strong').first();
      const baseText = anchor.length ? anchor.text() : $(li).text();
      const name = extractNameFromLiText(baseText);
      if (isProbableNomineeName(name)) {
        items.push({ category, name, sourceUrl });
      }
    });

    // 1b) Fallback: parágrafos com bullets
    region.find('p').each((_j, p) => {
      const raw = normalizeText($(p).text());
      if (/^[•\-–—]\s*/.test(raw)) {
        const name = extractNameFromLiText(raw);
        if (isProbableNomineeName(name)) {
          items.push({ category, name, sourceUrl });
        }
      }
    });

    // 1c) Fallback: elementos com role=listitem (acessibilidade)
    region.find('[role="listitem"]').each((_j, li) => {
      const name = extractNameFromLiText($(li).text());
      if (isProbableNomineeName(name)) {
        items.push({ category, name, sourceUrl });
      }
    });
  });

  // 2) Fallback global: quando não há headings “categoria”, tentar listas globais
  if (items.length === 0) {
    root.find('ul > li, ol > li').each((_j, li) => {
      const name = extractNameFromLiText($(li).text());
      if (isProbableNomineeName(name)) {
        items.push({ category: 'Indefinida', name, sourceUrl });
      }
    });
  }

  return dedupeNominees(items);
}

// Scraper principal
export async function scrapeOmeleteArticles(urls: string[]): Promise<ScrapeReport> {
  const processed: string[] = [];
  const skipped: Array<{ url: string; reason: string }> = [];
  const items: ScrapedNominee[] = [];

  for (const url of urls) {
    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OscarBot/1.0; +https://github.com/gavital/oscar-betting-app)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        cache: 'no-store',
      });

      if (!resp.ok) {
        skipped.push({ url, reason: `HTTP ${resp.status}` });
        continue;
      }

      const html = await resp.text();
      const $ = cheerio.load(html);

      // Primeiro tenta seletores específicos para “Lista completa”
      let extracted = parseArticleWithSelectors($, url);

      // Fallback extra: heurística anterior baseada em blocos “indicados”
      if (extracted.length === 0) {
        extracted = parseArticleHeuristic($, url);
      }

      if (extracted.length > 0) {
      items.push(...extracted);
      }
      processed.push(url);
    } catch (err: any) {
      skipped.push({ url, reason: err?.message ?? 'network_error' });
    }
  }

  return { items: dedupeNominees(items), processed, skipped };
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