import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { importNomineesFromRSS } from '@/app/(dashboard)/admin/nominees/rss/actions';

export async function GET() {
  const adminCheck = await requireAdmin();
  if (!adminCheck?.supabase) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { supabase } = adminCheck;

  const { data: rssConfigs, error } = await supabase
    .from('rss_feeds')
    .select('category_id')
    .eq('enabled', true);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const categories = Array.from(new Set((rssConfigs ?? []).map(c => c.category_id)));
  const results: Array<{ categoryId: string; ok: boolean; imported?: number; error?: string }> = [];

  for (const categoryId of categories) {
    const res = await importNomineesFromRSS(categoryId);
    results.push({ categoryId, ok: !!res.ok, imported: res.data?.imported, error: res.error });
  }

  return NextResponse.json({ ok: true, results });
}