// src/app/api/auth/forgot/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'edge'; // opcional

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ ok: false, error: 'Email inválido' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback?next=/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Erro inesperado' },
      { status: 500 }
    );
  }
}