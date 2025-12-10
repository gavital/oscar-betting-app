// src/lib/rss/parser.ts
import RSSParser from 'rss-parser';

export type Candidate = { name: string };

// Adiciona headers para evitar bloqueios
const parser = new RSSParser({
  requestOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; OscarBot/1.0; +https://github.com/gavital/oscar-betting-app)',
      'Accept': 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
    },
  },
});

// Probe simples para ignorar feeds quebrados (404/403/etc)
async function probeFeed(url: string): Promise<boolean> {
  try {
    // HEAD; se o servidor não suporta, cai para GET
    const resp = await fetch(url, { method: 'HEAD' });
    if (!resp.ok) {
      const g = await fetch(url, { method: 'GET' });
      return g.ok;
    }
    return true;
  } catch (_err) {
    return false;
  }
}

export async function fetchCandidatesFromFeeds(
  urls: string[],
  keywords: string[] = []
): Promise<Candidate[]> {
  const results: Candidate[] = [];

  for (const url of urls) {
    try {
      const ok = await probeFeed(url);
      if (!ok) {
        console.warn(`RSS probe failed for ${url}, skipping`);
        continue;
      }

      const feed = await parser.parseURL(url);
      for (const item of feed.items ?? []) {
        const title = item.title ?? '';
        const contentSnippet = item.contentSnippet ?? '';
        const content = item.content ?? '';
        const text = `${title} ${contentSnippet} ${content}`.toLowerCase();

        // Filtro por palavras-chave (simples)
        const matchesKeywords =
          keywords.length === 0 || keywords.some(k => text.includes(k.toLowerCase()));

        if (!matchesKeywords) continue;

        // Heurística: tentar extrair nomes de filmes de títulos
        // Ex.: “Oscar 2025: Indicados a Melhor Filme – Duna: Parte 2, Oppenheimer, ...”
        const extracted = extractNamesFromText(title) ?? [];
        for (const name of extracted) {
          if (name && name.length >= 2) {
            results.push({ name });
          }
        }
      }
    } catch (err) {
      console.error(`RSS parse failed for ${url}:`, err);
    }
  }

  // deduplicação simples
  const seen = new Set<string>();
  return results.filter(c => {
    const key = c.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Uma heurística simples baseada em vírgulas e “–”/“:”
// Em produção, você vai querer regexs ou dicionários por idioma/categoria
function extractNamesFromText(text?: string): string[] {
  if (!text) return [];
  const cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/–|—|:/g, ':')
    .trim();

  // Heurística: após "Indicados" ou "Nominated" separar por vírgulas
  const idxIndicados = cleaned.toLowerCase().indexOf('indicados');
  const idxNominated = cleaned.toLowerCase().indexOf('nominated');

  let slice = cleaned;
  if (idxIndicados >= 0) slice = cleaned.slice(idxIndicados + 'indicados'.length);
  else if (idxNominated >= 0) slice = cleaned.slice(idxNominated + 'nominated'.length);

  return slice
    .split(',')
    .map(s => s.replace(/[–—\-:]/g, ' ').trim())
    .filter(Boolean);
}