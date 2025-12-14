import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerSupabaseClient()
    const url = new URL(req.url)
    const yearParam = url.searchParams.get('year')
    const ceremonyYear = yearParam ? Number(yearParam) : null

    if (!params?.id) {
      return NextResponse.json({ ok: false, error: 'Missing category id' }, { status: 400 })
    }

    // Descobre ano quando não vier por querystring
    let year = ceremonyYear
    if (!year) {
      const { data: y } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'ceremony_year')
        .maybeSingle()
      year = Number(y?.value) || new Date().getFullYear()
    }

    const { data, error } = await supabase
      .from('nominees')
      .select('id, name, meta, tmdb_data, is_winner')
      .eq('category_id', params.id)
      .eq('ceremony_year', year)
      .order('name')

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, items: data ?? [] }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'internal_error' }, { status: 500 })
  }
}
