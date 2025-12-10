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

function normalizeText(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

// Heurística: dado um bloco de texto que contém "Indicados" e uma categoria,
// tenta extrair nomes separados por vírgula ou por linhas.
function extractNamesFromBlock(block: string): string[] {
  const cleaned = normalizeText(block);
  // corta logo após "indicados" para pegar a lista
  const idx = cleaned.toLowerCase().indexOf('indicados');
  let slice = idx >= 0 ? cleaned.slice(idx + 'indicados'.length) : cleaned;

  // remove prefixos comuns: ":" "–" "—"
  slice = slice.replace(/[–—:]/g, ' ');

  // tenta split por vírgula
  const commaSplit = slice.split(',').map(s => s.trim()).filter(Boolean);
  if (commaSplit.length >= 2) return commaSplit;

  // fallback: split por linhas
  const lineSplit = slice.split(/\n|•|-|\u2022/).map(s => s.trim()).filter(Boolean);
  if (lineSplit.length >= 2) return lineSplit;

  // fallback: nenhum padrão forte encontrado
  return [];
}

// Dado o HTML de um artigo, extrai pares (categoria, nomes) heurísticos.
function parseArticle(html: string, sourceUrl: string): ScrapedNominee[] {
  const $ = cheerio.load(html);
  const textBlocks: string[] = [];

  // agrega textos de elementos comuns em artigos
  $('h2, h3, p, li').each((_i, el) => {
    const t = normalizeText($(el).text() || '');
    if (t.length >= 8) textBlocks.push(t);
  });

  const nominees: ScrapedNominee[] = [];

  // percorre blocos procurando um bloco com "indicados" + categoria
  for (let i = 0; i < textBlocks.length; i++) {
    const block = textBlocks[i];
    if (!/\bindicados?\b/i.test(block)) continue;

    // detecta categoria naquele bloco ou em bloco adjacente
    let categoryLabel: string | null = null;

    for (const cat of CATEGORY_PATTERNS_PT) {
      if (cat.re.test(block)) {
        categoryLabel = cat.label;
        break;
      }
    }

    // se não achou no mesmo bloco, tenta olhar o bloco anterior ou próximo
    if (!categoryLabel && i > 0) {
      const prev = textBlocks[i - 1];
      for (const cat of CATEGORY_PATTERNS_PT) {
        if (cat.re.test(prev)) {
          categoryLabel = cat.label;
          break;
        }
      }
    }
    if (!categoryLabel && i < textBlocks.length - 1) {
      const next = textBlocks[i + 1];
      for (const cat of CATEGORY_PATTERNS_PT) {
        if (cat.re.test(next)) {
          categoryLabel = cat.label;
          break;
        }
      }
    }

    if (!categoryLabel) continue;

    const names = extractNamesFromBlock(block);
    for (const name of names) {
      // filtro simples para evitar textos longos
      if (name.length >= 2 && name.length <= 120) {
        nominees.push({ category: categoryLabel, name, sourceUrl });
      }
    }
  }

  return dedupeNominees(nominees);
}

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

// Scrape múltiplos URLs de artigos do Omelete
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
      const extracted = parseArticle(html, url);
      if (extracted.length === 0) {
        // pode ser artigo opinativo, sem lista; apenas marca como processado
        processed.push(url);
        continue;
      }

      items.push(...extracted);
      processed.push(url);
    } catch (err: any) {
      skipped.push({ url, reason: err?.message ?? 'network_error' });
    }
  }

  return { items: dedupeNominees(items), processed, skipped };
}