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
  { label: 'Melhor Roteiro Original', re: /\bmelhor roteiro original\b/i },
  { label: 'Melhor Roteiro Adaptado', re: /\bmelhor roteiro adaptado\b/i },
  { label: 'Melhor Fotografia', re: /\bmelhor fotografia\b/i },
  { label: 'Melhor Edição', re: /\bmelhor edi(c|ç)ão\b/i },
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
    /\b(lista|completa|confira|indicados|vencedores|premiação|premi(ac|ç)ão)\b/i,
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

// Heurística: dado um bloco de texto que contém "Indicados" e uma categoria,
// tenta extrair nomes separados por vírgula ou por linhas.
// function extractNamesFromBlock(block: string): string[] {
//   const cleaned = normalizeText(block);
//   // corta logo após "indicados" para pegar a lista
//   const idx = cleaned.toLowerCase().indexOf('indicados');
//   let slice = idx >= 0 ? cleaned.slice(idx + 'indicados'.length) : cleaned;

//   // remove prefixos comuns: ":" "–" "—"
//   slice = slice.replace(/[–—:]/g, ' ');

//   // tenta split por vírgula
//   const commaSplit = slice.split(',').map(s => s.trim()).filter(Boolean);
//   if (commaSplit.length >= 2) return commaSplit;

//   // fallback: split por linhas
//   const lineSplit = slice.split(/\n|•|-|\u2022/).map(s => s.trim()).filter(Boolean);
//   if (lineSplit.length >= 2) return lineSplit;

//   // fallback: nenhum padrão forte encontrado
//   return [];
// }

// // Dado o HTML de um artigo, extrai pares (categoria, nomes) heurísticos.
// function parseArticle(html: string, sourceUrl: string): ScrapedNominee[] {
//   const $ = cheerio.load(html);
//   const textBlocks: string[] = [];

//   // agrega textos de elementos comuns em artigos
//   $('h2, h3, p, li').each((_i, el) => {
//     const t = normalizeText($(el).text() || '');
//     if (t.length >= 8) textBlocks.push(t);
//   });

//   const nominees: ScrapedNominee[] = [];

//   // percorre blocos procurando um bloco com "indicados" + categoria
//   for (let i = 0; i < textBlocks.length; i++) {
//     const block = textBlocks[i];
//     if (!/\bindicados?\b/i.test(block)) continue;

//     // detecta categoria naquele bloco ou em bloco adjacente
//     let categoryLabel: string | null = null;

//     for (const cat of CATEGORY_PATTERNS_PT) {
//       if (cat.re.test(block)) {
//         categoryLabel = cat.label;
//         break;
//       }
//     }

//     // se não achou no mesmo bloco, tenta olhar o bloco anterior ou próximo
//     if (!categoryLabel && i > 0) {
//       const prev = textBlocks[i - 1];
//       for (const cat of CATEGORY_PATTERNS_PT) {
//         if (cat.re.test(prev)) {
//           categoryLabel = cat.label;
//           break;
//         }
//       }
//     }
//     if (!categoryLabel && i < textBlocks.length - 1) {
//       const next = textBlocks[i + 1];
//       for (const cat of CATEGORY_PATTERNS_PT) {
//         if (cat.re.test(next)) {
//           categoryLabel = cat.label;
//           break;
//         }
//       }
//     }

//     if (!categoryLabel) continue;

//     const names = extractNamesFromBlock(block);
//     for (const name of names) {
//       // filtro simples para evitar textos longos
//       if (name.length >= 2 && name.length <= 120) {
//         nominees.push({ category: categoryLabel, name, sourceUrl });
//       }
//     }
//   }

//   return dedupeNominees(nominees);
// }

function dedupeNominees(items: ScrapedNominee[]): ScrapedNominee[] {
  const seen = new Set<string>();
  const out: ScrapedNominee[] = [];
  for (const it of items) {
    const key = `${it.category.toLowerCase()}::${it.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
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

    // Região: elementos até próximo heading
    let cursor = $(el).next();
    const region: cheerio.Cheerio = cheerio.load('<div></div>')('div');
    while (cursor && cursor.length > 0) {
      const isNextHeading = cursor.is(HEADINGS_SEL);
      if (isNextHeading) break;
      // Append clone of cursor to region
      const html = '<div>' + cheerio.load('<div></div>')('div').append(cursor.clone()).html() + '</div>';
      region.append(html);
      cursor = cursor.next();
    }

    // 1a) Preferir listas explícitas <ul><li>, <ol><li>
    region.find('ul > li, ol > li').each((_j, li) => {
      // Se houver link dentro, usar o texto do link; senão, o próprio li
      const anchor = $(li).find('a').first();
      const raw = normalizeText(anchor.length ? anchor.text() : $(li).text());
      if (isProbableNomineeName(raw)) {
        items.push({ category, name: raw.replace(/^[•\-–—]\s*/, ''), sourceUrl });
      }
    });

    // 1b) Fallback: parágrafos com bullets
    region.find('p').each((_j, p) => {
      const raw = normalizeText($(p).text());
      if (/^[•\-–—]\s*/.test(raw) && isProbableNomineeName(raw)) {
        items.push({ category, name: raw.replace(/^[•\-–—]\s*/, ''), sourceUrl });
      }
    });

    // 1c) Fallback: elementos com role=listitem (acessibilidade)
    region.find('[role="listitem"]').each((_j, li) => {
      const raw = normalizeText($(li).text());
      if (isProbableNomineeName(raw)) {
        items.push({ category, name: raw.replace(/^[•\-–—]\s*/, ''), sourceUrl });
      }
    });
  });

  // 2) Fallback global: quando não há headings “categoria”, tentar listas globais
  if (items.length === 0) {
    root.find('ul > li, ol > li').each((_j, li) => {
      const raw = normalizeText($(li).text());
      if (isProbableNomineeName(raw)) {
        // Sem categoria detectada, marcar como “Indefinida” (pode ser ajustado depois)
        items.push({ category: 'Indefinida', name: raw.replace(/^[•\-–—]\s*/, ''), sourceUrl });
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

// Heurística anterior (mantida como fallback)
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

    const names = extractNamesFromBlock(block);
    for (const name of names) {
      if (isProbableNomineeName(name)) {
        out.push({ category: categoryLabel, name, sourceUrl });
      }
    }
  }

  return dedupeNominees(out);
}

function extractNamesFromBlock(block: string): string[] {
  const cleaned = normalizeText(block).replace(/[–—:]/g, ':');
  const idx = cleaned.toLowerCase().indexOf('indicados');
  let slice = idx >= 0 ? cleaned.slice(idx + 'indicados'.length) : cleaned;

  // vírgulas ou linhas
  const commaSplit = slice.split(',').map(s => s.trim()).filter(Boolean);
  if (commaSplit.length >= 2) return commaSplit;

  const lineSplit = slice.split(/\n|•|-|\u2022/).map(s => s.trim()).filter(Boolean);
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