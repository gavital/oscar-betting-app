// src/app/api/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClientMutable } from '@/lib/supabase/server-mutable';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/';

  const supabase = await createServerSupabaseClientMutable();

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Garantir que o profile existe após trocar o código
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const meta = user.user_metadata ?? {};
    const name = (meta.name as string) ?? user.email?.split('@')[0] ?? 'Usuário';
    const role = (meta.role as 'user' | 'admin') ?? 'user';

    // Upsert no profiles
    await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        name,
        role,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
  }

  return NextResponse.redirect(new URL(next, process.env.NEXT_PUBLIC_APP_URL));
}