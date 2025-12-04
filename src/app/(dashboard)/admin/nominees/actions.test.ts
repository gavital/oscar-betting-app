// src/app/(dashboard)/admin/nominees/actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Auth from '@/lib/auth/requireAdmin';
import {
  normalizeNomineeName,
  importNominees,
  createNominee,
  updateNominee,
  deleteNominee,
  enrichNomineeWithTMDB,
} from './actions';
import { createSupabaseStub } from '@/tests/mocks/supabaseClientMock';

// Mock revalidatePath (garante no-op em testes)
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(() => undefined) }));

describe('import nominees helpers', () => {
  it('normalizes names: trims and dedups', () => {
    const input = '  Indicado 1 \nIndicado 2\n\nIndicado 1  ';
    const lines = input.split('\n').map(s => s.trim()).filter(Boolean);
    const unique = Array.from(new Set(lines.map(normalizeNomineeName)));
    expect(unique).toEqual(['Indicado 1', 'Indicado 2']);
  });
});

describe('admin/nominees actions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Garante que fetch exista (evita falha ao fazer spy)
    if (!(global as any).fetch) {
      (global as any).fetch = vi.fn();
    }
    delete process.env.TMDB_API_KEY;
  });


  it('importNominees: dedup, limite respeitado (sem replace)', async () => {
    const supabase: any = createSupabaseStub({
      categories: [{ id: 'cat_1', name: 'Melhor Filme', max_nominees: 4, is_active: true }],
      nominees: [{ id: 'nom_a', category_id: 'cat_1', name: 'Existente' }],
    });
    vi.spyOn(Auth, 'requireAdmin').mockResolvedValue({ supabase } as any);

    const fd = new FormData();
    fd.set('category_id', 'cat_1');
    fd.set('bulk_text', 'A\nB\nB'); // dedupe -> A,B
    // replace = false (padrão)

    const res = await importNominees(fd);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data?.imported).toBe(2);
      expect(res.data?.removedDuplicates).toBe(1);
      expect(res.data?.truncated).toBe(0);
      // opcional: checar que foram inseridos
      const store = (supabase as any).__store;
      const inCat = store.nominees.filter((n: any) => n.category_id === 'cat_1');
      expect(inCat.length).toBe(3); // 1 existente + 2 importados
    }
  });

  it('importNominees: falha quando excede o limite (sem replace)', async () => {
    const supabase: any = createSupabaseStub({
      categories: [{ id: 'cat_1', name: 'Melhor Filme', max_nominees: 4, is_active: true }],
      nominees: [
        { id: 'n1', category_id: 'cat_1', name: 'E1' },
        { id: 'n2', category_id: 'cat_1', name: 'E2' },
        { id: 'n3', category_id: 'cat_1', name: 'E3' },
      ],
    });
    vi.spyOn(Auth, 'requireAdmin').mockResolvedValue({ supabase } as any);

    const fd = new FormData();
    fd.set('category_id', 'cat_1');
    fd.set('bulk_text', 'A\nB'); // 3 existentes + 2 importados = 5 > 4
    const res = await importNominees(fd);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('LIMIT_EXCEEDED');
  });

  it('importNominees: replace=true apaga antigos e importa novos', async () => {
    const supabase: any = createSupabaseStub({
      categories: [{ id: 'cat_1', name: 'Melhor Filme', max_nominees: 4, is_active: true }],
      nominees: [
        { id: 'n1', category_id: 'cat_1', name: 'Antigo 1' },
        { id: 'n2', category_id: 'cat_1', name: 'Antigo 2' },
      ],
    });
    vi.spyOn(Auth, 'requireAdmin').mockResolvedValue({ supabase } as any);

    const fd = new FormData();
    fd.set('category_id', 'cat_1');
    fd.set('bulk_text', 'A\nB\nB');
    fd.set('replace', 'true');

    const res = await importNominees(fd);
    expect(res.ok).toBe(true);
    const store = (supabase as any).__store;
    const inCat = store.nominees.filter((n: any) => n.category_id === 'cat_1');
    expect(inCat.map((n: any) => n.name).sort()).toEqual(['A', 'B']);
  });

  it('createNominee: duplica em mesma categoria (case-insensitive) e limite atingido', async () => {
    const supabase: any = createSupabaseStub({
      categories: [{ id: 'cat_1', name: 'Melhor Filme', max_nominees: 2, is_active: true }],
      nominees: [{ id: 'n1', category_id: 'cat_1', name: 'Alpha' }],
    });
    vi.spyOn(Auth, 'requireAdmin').mockResolvedValue({ supabase } as any);

    // duplicado
    let fd = new FormData();
    fd.set('category_id', 'cat_1');
    fd.set('name', 'alpha');
    let res = await createNominee(fd);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('NOMINEE_NAME_DUPLICATE');

    // limite
    fd = new FormData();
    fd.set('category_id', 'cat_1');
    fd.set('name', 'Beta');
    // primeiro insere (fica 2/2)
    const ok1 = await createNominee(fd);
    expect(ok1.ok).toBe(true);

    fd = new FormData();
    fd.set('category_id', 'cat_1');
    fd.set('name', 'Gamma');
    const limit = await createNominee(fd);
    expect(limit.ok).toBe(false);
    if (!limit.ok) expect(limit.error.code).toBe('LIMIT_EXCEEDED');
  });

  it('updateNominee: validações e sucesso', async () => {
    const supabase: any = createSupabaseStub({
      nominees: [
        { id: 'n1', category_id: 'cat_1', name: 'Alpha' },
        { id: 'n2', category_id: 'cat_1', name: 'Beta' },
      ],
    });
    vi.spyOn(Auth, 'requireAdmin').mockResolvedValue({ supabase } as any);

    // id obrigatório
    let fd = new FormData();
    fd.set('name', 'Zeta');
    let res = await updateNominee(fd);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('VALIDATION_ID_REQUIRED');

    // duplicado (mesma categoria)
    fd = new FormData();
    fd.set('id', 'n1');
    fd.set('name', 'beta');
    res = await updateNominee(fd);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('NOMINEE_NAME_DUPLICATE');

    // sucesso
    fd = new FormData();
    fd.set('id', 'n1');
    fd.set('name', 'Gamma');
    res = await updateNominee(fd);
    expect(res.ok).toBe(true);
  });

  it('deleteNominee: impede remoção com apostas associadas e permite quando não há', async () => {
    const supabase: any = createSupabaseStub({
      nominees: [
        { id: 'n1', category_id: 'cat_1', name: 'Alpha' },
        { id: 'n2', category_id: 'cat_1', name: 'Beta' },
      ],
      bets: [{ id: 'b1', nominee_id: 'n1', user_id: 'u1', category_id: 'cat_1' }],
    });
    vi.spyOn(Auth, 'requireAdmin').mockResolvedValue({ supabase } as any);

    // Com apostas
    let fd = new FormData();
    fd.set('id', 'n1');
    let res = await deleteNominee(fd);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('HAS_ASSOCIATED_BETS');

    // Sem apostas
    fd = new FormData();
    fd.set('id', 'n2');
    res = await deleteNominee(fd);
    expect(res.ok).toBe(true);
    const store = (supabase as any).__store;
    const existsN2 = store.nominees.some((n: any) => n.id === 'n2');
    expect(existsN2).toBe(false);
  });

  it('enrichNomineeWithTMDB: cobre erros e sucesso', async () => {
    const supabase: any = createSupabaseStub({
      nominees: [{ id: 'n1', category_id: 'cat_1', name: 'Movie' }],
    });
    vi.spyOn(Auth, 'requireAdmin').mockResolvedValue({ supabase } as any);

    // Sem API key
    let fd = new FormData();
    fd.set('nominee_id', 'n1');
    fd.set('category_id', 'cat_1');
    fd.set('name', 'Movie');
    let res = await enrichNomineeWithTMDB(fd);
    expect(res.ok).toBe(false);

    // Com API key mas fetch falha
    process.env.TMDB_API_KEY = 'key';
    vi.spyOn(global, 'fetch' as any).mockResolvedValueOnce({ ok: false } as any);
    res = await enrichNomineeWithTMDB(fd);
    expect(res.ok).toBe(false);
    if (!res.ok) expect((res as any).error).toBe('TMDB_FETCH_FAILED');

    // Sem resultados
    vi.spyOn(global, 'fetch' as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    } as any);
    res = await enrichNomineeWithTMDB(fd);
    expect(res.ok).toBe(false);
    if (!res.ok) expect((res as any).error).toBe('TMDB_NO_RESULTS');

    // Sucesso
    vi.spyOn(global, 'fetch' as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [{ id: 123, title: 'X' }] }),
    } as any);
    res = await enrichNomineeWithTMDB(fd);
    expect(res.ok).toBe(true);
    const store = (supabase as any).__store;
    const updated = store.nominees.find((n: any) => n.id === 'n1');
    expect(updated.tmdb_id).toBe('123');
    expect(updated.tmdb_data).toBeTruthy();
  });
});