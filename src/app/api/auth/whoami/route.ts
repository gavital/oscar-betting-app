// src/app/api/auth/whoami/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();

    let profile: any = null;
    let profileErr: any = null;

    if (user) {
      const result = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('id', user.id)
        .maybeSingle();

      profile = result.data ?? null;
      profileErr = result.error ? { message: result.error.message, code: result.error.code } : null;
    }

    return NextResponse.json({
      ok: true,
      host: process.env.NEXT_PUBLIC_APP_URL,
      user: user ? { id: user.id, email: user.email } : null,
      profile,
      errors: {
        getUser: userErr ? { message: userErr.message } : null,
        selectProfile: profileErr
      }
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}