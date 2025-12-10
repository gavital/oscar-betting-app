// src/app/api/rss/omelete/[year]/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { scrapeOmeleteArticles } from '@/lib/scrapers/omelete';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server-service';
import { discoverOmeleteArticleUrlsByYear } from '@/lib/scrapers/omelete';

type CtxParams =
  | { params: { year: string } }
  | { params: Promise<{ year: string }> };

function escapeXml(s: string) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string));
}

function buildMinimalRss({
  channel,
  items,
}: {
  channel: { title: string; link: string; description: string };
  items: Array<{ title: string; link?: string; description?: string; pubDate?: string; guid?: string }>;
}) {
  const header =
    `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n` +
    `<title>${escapeXml(channel.title)}</title>\n` +
    `<link>${escapeXml(channel.link)}</link>\n` +
    `<description>${escapeXml(channel.description)}</description>\n`;

  const body = items
    .map(
      (i) =>
        `<item>\n` +
        `<title>${escapeXml(i.title)}</title>\n` +
        (i.link ? `<link>${escapeXml(i.link)}</link>\n` : '') +
        (i.description ? `<description>${escapeXml(i.description)}</description>\n` : '') +
        (i.pubDate ? `<pubDate>${escapeXml(i.pubDate)}</pubDate>\n` : '') +
        (i.guid ? `<guid>${escapeXml(i.guid)}</guid>\n` : '') +
        `</item>`
    )
    .join('\n');

  const footer = `\n</channel>\n</rss>`;
  return header + body + footer;
}

function normalizeUrl(url: string): string {
  const s = (url ?? '').trim();
  try {
    const u = new URL(s);
    if (u.protocol === 'http:') u.protocol = 'https:';
    return u.toString();
  } catch {
    return s;
  }
}

export async function GET(req: Request, ctx: CtxParams) {
  let supabase;
  try {
    // Se existir SERVICE ROLE, usa service client (ignora RLS)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      supabase = createServerSupabaseServiceClient();
    } else {
      supabase = await createServerSupabaseClient();
    }
  } catch (_err) {
    // Fallback: SSR client com cookies (precisa de sessão/autenticado)
    supabase = await createServerSupabaseClient();
  }

  // Compat: alguns ambientes tratam params como Promise
  const params = 'then' in ctx.params ? await ctx.params : ctx.params;
  const year = params.year;

  const url = new URL(req.url);
  const format = url.searchParams.get('format') ?? 'rss'; // rss | json

  try {
    // lê rss_feeds habilitados e filtra domínio omelete
    const { data: feeds, error } = await supabase
      .from('rss_feeds')
      .select('url, enabled')
      .eq('enabled', true);

    if (error) {
      const payload = { ok: false, error: error.message };
      return NextResponse.json(payload, { status: 500 });
    }

    // Filtra fontes do Omelete (normalização + domínio)
    let omeleteSources = (feeds ?? [])
      .map(f => (typeof f.url === 'string' ? normalizeUrl(f.url) : ''))
      .filter(u => u && /(^https?:\/\/)?(www\.)?omelete\.com\.br/i.test(u));

    // Fallback: busca no DB por ilike, caso o filtro local não ache nada
    if (omeleteSources.length === 0) {
      const { data: fallback, error: fbErr } = await supabase
        .from('rss_feeds')
        .select('url')
        .eq('enabled', true)
        .ilike('url', '%omelete.com.br%');

      if (!fbErr && fallback && fallback.length > 0) {
        omeleteSources = fallback
          .map(f => (typeof f.url === 'string' ? normalizeUrl(f.url) : ''))
          .filter(u => u);
      }
    }

    console.info(`[rss][omelete][${year}] enabled_feeds=${(feeds ?? []).length} omelete_sources=${omeleteSources.length}`);

    if (omeleteSources.length === 0) {
      const rss = buildMinimalRss({
        channel: {
          title: `Oscars ${year} – Nominees (Omelete source)`,
          link: 'https://www.omelete.com.br/',
          description: `No Omelete sources configured (rss_feeds enabled=${(feeds ?? []).length})`,
        },
        items: [],
      });
      return new NextResponse(rss, {
        status: 200,
        headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
      });
    }

    // Scrape das fontes
    const { items, processed, skipped } = await scrapeOmeleteArticles(omeleteSources);

    const strictYear = String(year);
const filteredItems = items.filter(it => {
  // Aceita somente itens cuja URL contenha /oscar-{year}/
  try {
    const u = new URL(it.sourceUrl);
    return new RegExp(`/oscar-${strictYear}/`, 'i').test(u.pathname);
  } catch {
    return false;
  }
});

if (format === 'json') {
  return NextResponse.json({
    ok: true,
    year,
    summary: {
      itemsCount: filteredItems.length,
      processedCount: processed.length,
      skippedCount: skipped.length,
    },
    processed,
    skipped,
    items: filteredItems,
  });
}

const rssItems = filteredItems.map(it => ({
  title: `${it.category} – ${it.name} (${year})`,
  link: it.sourceUrl,
  description: `Indicado: ${it.name} • Categoria: ${it.category} • Fonte: Omelete`,
  pubDate: new Date().toUTCString(),
  guid: `${it.sourceUrl}#${encodeURIComponent(it.category)}#${encodeURIComponent(it.name)}`,
}));


    // logs para observabilidade
    console.info(`[rss][omelete][${year}] processed=${processed.length} skipped=${skipped.length}`);

    if (format === 'json') {
      return NextResponse.json({
        ok: true,
        year,
        summary: {
          itemsCount: items.length,
          processedCount: processed.length,
          skippedCount: skipped.length,
        },
        processed,
        skipped,
        items,
      });
    }

    // if (skipped.length > 0) {
    //   console.warn(`[rss][omelete][${year}] skipped:`, skipped.slice(0, 5));
    // }

    // // Filtra por ano no título/descrição quando possível (heurística leve).
    // const yearRe = new RegExp(String(year), 'i');
    // const filtered = items.filter(it => {
    //   // Se o artigo não contém ano, ainda mantemos (alguns artigos são atemporais).
    //   // Você pode tornar isso estrito se preferir.
    //   return true;
    // });

    const rssItems = items.map(it => ({
      title: `${it.category} – ${it.name} (${year})`,
      link: it.sourceUrl,
      description: `Indicado: ${it.name} • Categoria: ${it.category} • Fonte: Omelete`,
      pubDate: new Date().toUTCString(),
      guid: `${it.sourceUrl}#${encodeURIComponent(it.category)}#${encodeURIComponent(it.name)}`,
    }));

    const rss = buildMinimalRss({
      channel: {
        title: `Oscars ${year} – Nominees (Omelete)`,
        link: 'https://www.omelete.com.br/',
        description: `Aggregated nominees parsed from Omelete articles for year ${year}`,
      },
      items: rssItems,
    });

    return new NextResponse(rss, {
      status: 200,
      headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
    });
  } catch (err: any) {
    // Em caso de erro, devolve JSON (para a UI não quebrar)
    return NextResponse.json({
      ok: false,
      error: err?.message ?? 'internal_error',
    }, { status: 500 });
  }
}

// Filtra fontes configuradas do Omelete (normalização + domínio)
let configuredSources = (feeds ?? [])
.map(f => (typeof f.url === 'string' ? normalizeUrl(f.url) : ''))
.filter(u => u && /(^https?:\/\/)?(www\.)?omelete\.com\.br/i.test(u));

// Descoberta dinâmica de artigos por ano
const discoveredSources = await discoverOmeleteArticleUrlsByYear(Number(year), { maxPages: 5 });

// Mescla configurados + descobertos
let omeleteSources = Array.from(new Set([ ...configuredSources, ...discoveredSources ]));

// Fallback: busca no DB por ilike, caso a filtragem local não ache nada configurado
if (omeleteSources.length === 0) {
const { data: fallback, error: fbErr } = await supabase
  .from('rss_feeds')
  .select('url')
  .eq('enabled', true)
  .ilike('url', '%omelete.com.br%');

if (!fbErr && fallback && fallback.length > 0) {
  omeleteSources = Array.from(new Set([
    ...omeleteSources,
    ...fallback
      .map(f => (typeof f.url === 'string' ? normalizeUrl(f.url) : ''))
      .filter(u => u),
  ]));
}
}

console.info(`[rss][omelete][${year}] enabled_feeds=${(feeds ?? []).length} configured=${configuredSources.length} discovered=${discoveredSources.length} sources=${omeleteSources.length}`);