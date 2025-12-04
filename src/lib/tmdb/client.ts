// src/lib/tmdb/client.ts
const TMDB_API_BASE = 'https://api.themoviedb.org/3';

type FetchJson = <T>(url: string, init?: RequestInit) => Promise<T>;

function getApiKey(): string {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error('TMDB_API_KEY is missing');
  return apiKey;
}

function getLanguage(): string {
  return process.env.TMDB_LANGUAGE || 'pt-BR';
}

export function getTmdbImageUrl(
  path?: string,
  size: 'list' | 'detail' = 'list'
): string | null {
  if (!path) return null;
  const base = process.env.TMDB_IMAGE_BASE || 'https://image.tmdb.org/t/p';
  const sizeName =
    size === 'detail'
      ? process.env.TMDB_IMAGE_SIZE_DETAIL || 'w500'
      : process.env.TMDB_IMAGE_SIZE_LIST || 'w185';
  return `${base}/${sizeName}${path}`;
}

// fetch com cache leve via Next (evite em Server Actions muito longas)
const fetchJson: FetchJson = async (url, init) => {
  const res = await fetch(url, {
    ...init,
    cache: 'no-store', // evite stale em formulários; poderá ajustar para 'force-cache' em páginas estáticas
  });
  if (!res.ok) {
    const status = (res as any).status ?? 500;
    const statusText = (res as any).statusText ?? 'Internal Server Error';
    throw new Error(`TMDB request failed: ${status} ${statusText}`);
  }
  return res.json() as Promise<any>;
};

// Busca por filme
export async function searchMovieByName(query: string) {
  const apiKey = getApiKey();
  const lang = getLanguage();
  const url = `${TMDB_API_BASE}/search/movie?query=${encodeURIComponent(query)}&language=${encodeURIComponent(lang)}&include_adult=false&api_key=${apiKey}`;
  const json = await fetchJson<{ results: any[] }>(url);
  return json.results || [];
}

// Busca por pessoa
export async function searchPersonByName(query: string) {
  const apiKey = getApiKey();
  const lang = getLanguage();
  const url = `${TMDB_API_BASE}/search/person?query=${encodeURIComponent(query)}&language=${encodeURIComponent(lang)}&include_adult=false&api_key=${apiKey}`;
  const json = await fetchJson<{ results: any[] }>(url);
  return json.results || [];
}

// Detalhes de filme
export async function getMovieDetails(id: string | number) {
  const apiKey = getApiKey();
  const lang = getLanguage();
  const url = `${TMDB_API_BASE}/movie/${id}?language=${encodeURIComponent(lang)}&api_key=${apiKey}`;
  return fetchJson<any>(url);
}

// Detalhes de pessoa
export async function getPersonDetails(id: string | number) {
  const apiKey = getApiKey();
  const lang = getLanguage();
  const url = `${TMDB_API_BASE}/person/${id}?language=${encodeURIComponent(lang)}&api_key=${apiKey}`;
  return fetchJson<any>(url);
}