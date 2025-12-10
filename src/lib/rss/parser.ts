// src/lib/rss/parser.ts
import RSSParser from 'rss-parser';

export type Candidate = { name: string };

type SkipInfo = { url: string; reason: string; status?: number };

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; OscarBot/1.0; +https://github.com/gavital/oscar-betting-app)',
  'Accept': 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
};

// Parser com headers
const parser = new RSSParser({
  requestOptions: {
    headers: DEFAULT_HEADERS,
  },
});

// Timeout helper
async function timedFetch(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// Normaliza URL (upgrade forçado para https quando for http)
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol === 'http:') {
      u.protocol = 'https:';
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
}

// Probe de feed com headers, timeout e fallback
async function probeFeed(url: string): Promise<{ ok: boolean; status?: number; reason?: string }> {
  const normalized = normalizeUrl(url);

  try {
    const head = await timedFetch(normalized, { method: 'HEAD', headers: DEFAULT_HEADERS }, 5000);
    if (head.ok) return { ok: true, status: head.status };

    // Alguns servidores não suportam HEAD; tenta GET
    const get = await timedFetch(normalized, { method: 'GET', headers: DEFAULT_HEADERS }, 7000);
    if (get.ok) return { ok: true, status: get.status };

    return { ok: false, status: get.status, reason: `HTTP ${get.status}` };
  } catch (err: any) {
    const reason = err?.name === 'AbortError' ? 'timeout' : (err?.message ?? 'network_error');
    return { ok: false, reason };
  }
}

// Função detalhada: retorna candidatos e lista de feeds ignorados
export async function fetchFromFeedsDetailed(
  urls: string[],
  keywords: string[] = []
): Promise<{ candidates: Candidate[]; skipped: SkipInfo[]; processed: string[] }> {
  const results: Candidate[] = [];
  const skipped: SkipInfo[] = [];
  const processed: string[] = [];

  for (const original of urls) {
    const url = normalizeUrl(original);
    const probe = await probeFeed(url);

    if (!probe.ok) {
      skipped.push({ url: original, reason: probe.reason ?? 'unreachable', status: probe.status });
      console.warn(`RSS probe failed for ${original} (${probe.reason ?? probe.status})`);
        continue;
      }

    try {
      const feed = await parser.parseURL(url);
      processed.push(original);

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
    } catch (err: any) {
      skipped.push({ url: original, reason: err?.message ?? 'parse_error' });
      console.error(`RSS parse failed for ${original}:`, err);
    }
  }

  // Deduplicação simples
  const seen = new Set<string>();
  const candidates = results.filter(c => {
    const key = c.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { candidates, skipped, processed };
}

// Compatibilidade: função antiga continua disponível (usa a detalhada internamente)
export async function fetchCandidatesFromFeeds(
  urls: string[],
  keywords: string[] = []
): Promise<Candidate[]> {
  const { candidates } = await fetchFromFeedsDetailed(urls, keywords);
  return candidates;
}

// Heurística simples baseada em vírgulas e “–”/“:”
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