// src/lib/auth/ensureProfile.ts
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

/**
 * Garante que exista uma linha em public.profiles para o usuário atual.
 * - Se o e-mail estiver em ADMIN_EMAILS, define role = 'admin'
 * - Caso contrário, mantém/metadado ou 'user'
 */
export async function ensureProfile() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };

  // 1) Tenta ler o profile existente
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, name, role')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) {
    return { supabase, user, profile: existing };
  }

  // 2) Se não existir, cria
  const admins = parseAdminEmails();
  const isAdmin = user.email ? admins.has(user.email.toLowerCase()) : false;

  const meta = user.user_metadata ?? {};
  const name = (meta.name as string) ?? user.email?.split('@')[0] ?? 'Usuário';
  const role: 'user' | 'admin' =
    isAdmin ? 'admin' : ((meta.role as 'user' | 'admin') ?? 'user');

  await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        name,
        role,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  // 3) Lê novamente para devolver o profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, role')
    .eq('id', user.id)
    .single();

  return { supabase, user, profile };
}