import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Criar cliente Supabase no lado do servidor
    const cookieStore = cookies();
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    // Criar cliente Supabase com cookies para manter a sessão
    const supabase = createClient(supabaseUrl, supabaseKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    });
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    // Verificar na tabela user_roles se o usuário é administrador
    const { data: userRole, error } = await supabase
      .from('user_roles')
      .select('is_admin')
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      console.error('Erro ao verificar role do usuário:', error);
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }

    return NextResponse.json({ isAdmin: userRole?.is_admin || false }, { status: 200 });
  } catch (error) {
    console.error('Erro ao verificar status de administrador:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}