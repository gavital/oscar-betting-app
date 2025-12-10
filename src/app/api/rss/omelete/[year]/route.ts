// src/app/api/rss/omelete/[year]/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server-service';
import { scrapeOmeleteArticles, discoverOmeleteArticleUrlsByYear } from '@/lib/scrapers/omelete';

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
  // Cria cliente Supabase (service role se disponível; fallback SSR)
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

  // Compatibilidade: alguns ambientes tratam params como Promise
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
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Fontes configuradas do Omelete (normalização + domínio)
    const configuredSources = (feeds ?? [])
      .map(f => (typeof f.url === 'string' ? normalizeUrl(f.url) : ''))
      .filter(u => u && /(^https?:\/\/)?(www\.)?omelete\.com\.br/i.test(u));

    // Descoberta dinâmica de artigos por ano (ex.: /oscar-{year}?page=N)
    const discoveredSources = await discoverOmeleteArticleUrlsByYear(Number(year), { maxPages: 5 });

    // Mescla configurados + descobertos (únicos)
    let omeleteSources = Array.from(new Set([ ...configuredSources, ...discoveredSources ]));

    // Fallback: busca no DB por ilike caso nada tenha sido encontrado
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

    // Filtro estrito por ano (apenas URLs com /oscar-{year}/)
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

    console.info(`[rss][omelete][${year}] processed=${processed.length} skipped=${skipped.length} filteredItems=${filteredItems.length}`);

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

    // Monta RSS a partir dos itens filtrados
const rssItems = filteredItems.map(it => ({
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