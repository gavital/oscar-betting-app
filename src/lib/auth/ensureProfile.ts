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
 * Promove para admin se o e-mail estiver na lista ADMIN_EMAILS (dev/prod controlado por env).
 */
export async function ensureProfile() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };

  const { data: existing, error } = await supabase
    .from('profiles')
    .select('id, name, role')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    // Em dev, se RLS bloquear SELECT, retornará erro. Ainda assim tentamos upsert abaixo.
    // Você pode logar error.message aqui se precisar.
  }

  if (existing) return { supabase, user, profile: existing };

  const admins = parseAdminEmails();
  const isAdmin = user.email ? admins.has(user.email.toLowerCase()) : false;

  const meta = user.user_metadata ?? {};
  const name = (meta.name as string) ?? user.email?.split('@')[0] ?? 'Usuário';
  const role: 'user' | 'admin' = isAdmin ? 'admin' : (meta.role as any) ?? 'user';

  await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      name,
      role,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, role')
    .eq('id', user.id)
    .single();

  return { supabase, user, profile };
}