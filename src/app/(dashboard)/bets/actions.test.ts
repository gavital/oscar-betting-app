// src/app/(dashboard)/bets/actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { confirmBet } from './actions';
import { createSupabaseStub } from '@/tests/mocks/supabaseClientMock';
import { revalidatePath } from 'next/cache';

// Mock revalidatePath como no setup (redundante aqui, mas mantém claro)
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(() => undefined) }));

describe('bets/actions: confirmBet', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('falha se usuário não autenticado', async () => {
    const supabase: any = createSupabaseStub();
    // Mock getUser para null
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({ data: { user: null } });

    // Injetar supabase no confirmBet via mock do import (se necessário). Como confirmBet cria seu próprio client, vamos stubar a factory:
    // Alternativa simples: mockar createServerSupabaseClient e fazê-lo retornar nosso supabase stub
    const mod = await vi.importActual<any>('@/lib/supabase/server');
    vi.spyOn(mod, 'createServerSupabaseClient').mockResolvedValue(supabase);

    const fd = new FormData();
    fd.set('category_id', 'cat_1');
    fd.set('nominee_id', 'n1');

    const res = await confirmBet(fd);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('AUTH_NOT_AUTHENTICATED');
  });

  it('falha se categoria não existir ou inativa', async () => {
    const supabase: any = createSupabaseStub({
      categories: [{ id: 'cat_1', name: 'Melhor Filme', max_nominees: 5, is_active: false }]
    });
    const mod = await vi.importActual<any>('@/lib/supabase/server');
    vi.spyOn(mod, 'createServerSupabaseClient').mockResolvedValue(supabase);

    // Usuário autenticado
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({ data: { user: { id: 'u1', email: 'x@y.z' } } });

    const fd = new FormData();
    fd.set('category_id', 'cat_1');
    fd.set('nominee_id', 'n1');

    const res = await confirmBet(fd);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('CATEGORY_NOT_FOUND'); // ou STATUS_INACTIVE, conforme sua action
  });

  it('sucesso: upsert aposta por (user_id, category_id)', async () => {
    const supabase: any = createSupabaseStub({
      categories: [{ id: 'cat_1', name: 'Melhor Filme', max_nominees: 5, is_active: true }],
      nominees: [{ id: 'n1', category_id: 'cat_1', name: 'Alpha' }]
    });
    const mod = await vi.importActual<any>('@/lib/supabase/server');
    vi.spyOn(mod, 'createServerSupabaseClient').mockResolvedValue(supabase);

    // Usuário autenticado
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({ data: { user: { id: 'u1', email: 'x@y.z' } } });

    // Primeira aposta
    let fd = new FormData();
    fd.set('category_id', 'cat_1');
    fd.set('nominee_id', 'n1');
    let res = await confirmBet(fd);
    expect(res.ok).toBe(true);

    // Mudar aposta para outro nominee (se existir)
    const store = (supabase as any).__store;
    store.nominees.push({ id: 'n2', category_id: 'cat_1', name: 'Beta' });

    fd = new FormData();
    fd.set('category_id', 'cat_1');
    fd.set('nominee_id', 'n2');
    res = await confirmBet(fd);
    expect(res.ok).toBe(true);

    // Confirma que a linha foi atualizada (mesmo user e categoria)
    const betsForUserCat = store.bets.filter((b: any) => b.user_id === 'u1' && b.category_id === 'cat_1');
    expect(betsForUserCat.length).toBe(1);
    expect(betsForUserCat[0].nominee_id).toBe('n2');
  });

  it('falha quando nominee não pertence à categoria', async () => {
    const supabase: any = createSupabaseStub({
      categories: [{ id: 'cat_1', name: 'Melhor Filme', max_nominees: 5, is_active: true }],
      nominees: [{ id: 'nX', category_id: 'cat_2', name: 'Outro' }]
    });
    const mod = await vi.importActual<any>('@/lib/supabase/server');
    vi.spyOn(mod, 'createServerSupabaseClient').mockResolvedValue(supabase);

    vi.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({ data: { user: { id: 'u1', email: 'x@y.z' } } });

    const fd = new FormData();
    fd.set('category_id', 'cat_1');
    fd.set('nominee_id', 'nX'); // nominee de outra categoria

    const res = await confirmBet(fd);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('NOMINEE_NOT_IN_CATEGORY');
  });
});