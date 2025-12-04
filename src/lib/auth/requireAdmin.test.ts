// src/lib/auth/requireAdmin.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAdmin } from './requireAdmin';
import { createSupabaseStub } from '@/tests/mocks/supabaseClientMock';

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.ADMIN_EMAILS = 'admin@example.com';
  });

  it('retorna AUTH_NOT_AUTHENTICATED quando não há usuário', async () => {
    const supabase: any = createSupabaseStub({ profiles: [] });
    const mod = await vi.importActual<any>('@/lib/supabase/server');
    vi.spyOn(mod, 'createServerSupabaseClient').mockResolvedValue(supabase);
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({ data: { user: null } } as any);

    const res = await requireAdmin();
    expect('error' in res).toBe(true);
    if ('error' in res) {
      expect(res.error.code).toBe('AUTH_NOT_AUTHENTICATED');
    }
  });

  it('retorna AUTH_FORBIDDEN quando role=usuario e email não está em ADMIN_EMAILS', async () => {
    const supabase: any = createSupabaseStub({
      profiles: [{ id: 'u1', name: 'User', role: 'user' }],
    });
    const mod = await vi.importActual<any>('@/lib/supabase/server');
    vi.spyOn(mod, 'createServerSupabaseClient').mockResolvedValue(supabase);
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({ data: { user: { id: 'u1', email: 'nao-admin@example.com' } } } as any);

    const res = await requireAdmin();
    expect('error' in res).toBe(true);
    if ('error' in res) {
      expect(res.error.code).toBe('AUTH_FORBIDDEN');
    }
  });

  it('sucesso quando role=admin', async () => {
    const supabase: any = createSupabaseStub({
      profiles: [{ id: 'u1', name: 'Admin', role: 'admin' }],
    });
    const mod = await vi.importActual<any>('@/lib/supabase/server');
    vi.spyOn(mod, 'createServerSupabaseClient').mockResolvedValue(supabase);
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({ data: { user: { id: 'u1', email: 'qualquer@example.com' } } } as any);

    const res = await requireAdmin();
    expect('error' in res).toBe(false);
    if (!('error' in res)) {
      expect(res.supabase).toBeTruthy();
    }
  });

  it('sucesso quando role=user mas email está em ADMIN_EMAILS (promovido dinamicamente)', async () => {
    const supabase: any = createSupabaseStub({
      profiles: [{ id: 'u1', name: 'User', role: 'user' }],
    });
    const mod = await vi.importActual<any>('@/lib/supabase/server');
    vi.spyOn(mod, 'createServerSupabaseClient').mockResolvedValue(supabase);
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({ data: { user: { id: 'u1', email: 'admin@example.com' } } } as any);

    const res = await requireAdmin();
    expect('error' in res).toBe(false);
    if (!('error' in res)) {
      // opcional: poderíamos inspecionar store.profiles para ver role atualizado
      expect(res.supabase).toBeTruthy();
    }
  });
});