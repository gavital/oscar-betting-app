// src/app/api/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClientMutable } from '@/lib/supabase/server-mutable';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/';

  if (code) {
    const supabase = await createServerSupabaseClientMutable();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, process.env.NEXT_PUBLIC_APP_URL));
}