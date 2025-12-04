// src/lib/auth/requireAdmin.ts
import { createServerSupabaseClient } from '@/lib/supabase/server';

function parseAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS || '';
  return new Set(
    raw
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

type RequireAdminError = {
  code: 'AUTH_NOT_AUTHENTICATED' | 'DB_SELECT_ERROR' | 'AUTH_FORBIDDEN';
  message: string;
  field?: 'auth' | 'role';
}

type RequireAdminSuccess = {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
}

export async function requireAdmin(): Promise<RequireAdminSuccess | { error: RequireAdminError }> {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: { code: 'AUTH_NOT_AUTHENTICATED', message: 'Faça login', field: 'auth' } };
  }

  // Lê role do perfil
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    return { error: { code: 'DB_SELECT_ERROR', message: profileError.message, field: 'role' } };
  }

  let role = (profile?.role ?? 'user').toLowerCase();

  // Fallback para admins definidos via env (dev/bootstrap)
  if (role !== 'admin') {
    const admins = parseAdminEmails();
    const email = user.email?.toLowerCase() ?? '';
    if (admins.has(email)) {
      await supabase
        .from('profiles')
        .update({ role: 'admin', updated_at: new Date().toISOString() })
        .eq('id', user.id);
      role = 'admin';
    }
  }

  if (role !== 'admin') {
    return { error: { code: 'AUTH_FORBIDDEN', message: 'Acesso negado', field: 'role' } };
  }

  return { supabase };
}