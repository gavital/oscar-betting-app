// src/app/api/check-admin/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('is_admin')
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      console.error('Erro ao verificar role do usuário:', error);
      return NextResponse.json({ isAdmin: false });
    }

    return NextResponse.json({ isAdmin: data?.is_admin || false });
  } catch (error) {
    console.error('Erro ao verificar status de administrador:', error);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}