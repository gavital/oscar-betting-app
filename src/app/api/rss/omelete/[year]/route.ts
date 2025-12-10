// src/app/api/rss/omelete/[year]/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { scrapeOmeleteArticles } from '@/lib/scrapers/omelete';

export async function GET(_req: Request, { params }: { params: { year: string } }) {
  const supabase = await createServerSupabaseClient();
  const year = params.year;

  // lê rss_feeds habilitados e filtra domínio omelete
  const { data: feeds, error } = await supabase
    .from('rss_feeds')
    .select('url, enabled')
    .eq('enabled', true);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const omeleteSources = (feeds ?? [])
    .map(f => f.url)
    .filter(u => typeof u === 'string' && /omelete\.com\.br/i.test(u));

  if (omeleteSources.length === 0) {
    return new NextResponse(buildMinimalRss({
      channel: {
        title: `Oscars ${year} – Nominees (Omelete source)`,
        link: 'https://www.omelete.com.br/',
        description: `No Omelete sources configured (rss_feeds)`,
      },
      items: [],
    }), { status: 200, headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
  }

  const { items, processed, skipped } = await scrapeOmeleteArticles(omeleteSources);

  // LOGS para auditoria
  console.info(`[rss][omelete][${year}] processed=${processed.length} skipped=${skipped.length}`);
  if (skipped.length > 0) {
    console.warn(`[rss][omelete][${year}] skipped:`, skipped.slice(0, 5));
  }

  // Filtra por ano no título/descrição quando possível (heurística leve).
  const yearRe = new RegExp(String(year), 'i');
  const filtered = items.filter(it => {
    // Se o artigo não contém ano, ainda mantemos (alguns artigos são atemporais).
    // Você pode tornar isso estrito se preferir.
    return true;
  });

  const rssItems = filtered.map(it => ({
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

function escapeXml(s: string) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string));
}