// src/lib/rss/parser.ts
import RSSParser from 'rss-parser';

export type Candidate = { name: string };

export async function fetchCandidatesFromFeeds(
  urls: string[],
  keywords: string[] = []
): Promise<Candidate[]> {
  const parser = new RSSParser();
  const results: Candidate[] = [];

  for (const url of urls) {
    try {
      const feed = await parser.parseURL(url);
      for (const item of feed.items ?? []) {
        const title = item.title ?? '';
        const content = `${item.contentSnippet ?? ''} ${item.content ?? ''}`.toLowerCase();
        const text = `${title} ${content}`.toLowerCase();

        // Filtro por palavras-chave (simples)
        const matchesKeywords =
          keywords.length === 0 || keywords.some(k => text.includes(k.toLowerCase()));

        if (!matchesKeywords) continue;

        // Heurística: tentar extrair nomes de filmes de títulos
        // Ex.: “Oscar 2025: Indicados a Melhor Filme – Duna: Parte 2, Oppenheimer, ...”
        const extracted = extractNamesFromText(title) ?? extractNamesFromText(content);
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

  // exemplo: separar depois de "Indicados" e dividir por vírgula
  const idx = cleaned.toLowerCase().indexOf('indicados');
  let slice = cleaned;
  if (idx >= 0) {
    slice = cleaned.slice(idx + 'indicados'.length);
  }

  return slice
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}