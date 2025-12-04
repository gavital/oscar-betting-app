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
 * - Se o e-mail estiver em ADMIN_EMAILS, promove a "admin" (mesmo se já existir).
 * - Normaliza role para lowercase.
 */
export async function ensureProfile() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };

  const admins = parseAdminEmails();
  const emailIsAdmin = user.email ? admins.has(user.email.toLowerCase()) : false;

  // 1) Tenta ler o profile existente
  const { data: profileRow, error: selectErr } = await supabase
    .from('profiles')
    .select('id, name, role')
    .eq('id', user.id)
    .maybeSingle();

  // 2) Se existir, normaliza e promove se necessário
  if (profileRow) {
    const currentRole = (profileRow.role ?? 'user').toLowerCase();
    if (emailIsAdmin && currentRole !== 'admin') {
      await supabase
        .from('profiles')
        .update({ role: 'admin', updated_at: new Date().toISOString() })
        .eq('id', user.id);

      const { data: promoted } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('id', user.id)
        .single();

        return { supabase, user, profile: { ...promoted, role: (promoted?.role ?? 'user').toLowerCase() } };
    }

    // Garantir retorno com role normalizado
    return { supabase, user, profile: { ...profileRow, role: currentRole } };
  }

  // 3) Se não existir, cria com base no metadata/ADMIN_EMAILS
  const meta = user.user_metadata ?? {};
  const name = (meta.name as string) ?? user.email?.split('@')[0] ?? 'Usuário';
  const role: 'user' | 'admin' =
    emailIsAdmin ? 'admin' : ((meta.role as 'user' | 'admin') ?? 'user');

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

    const { data: created } = await supabase
    .from('profiles')
    .select('id, name, role')
    .eq('id', user.id)
    .single();

    return { supabase, user, profile: created ? { ...created, role: (created.role ?? 'user').toLowerCase() } : null };
}