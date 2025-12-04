// src/app/(dashboard)/admin/categories/actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Auth from '@/lib/auth/requireAdmin';
import { createCategory, editCategory, toggleCategoryActive, toggleCategoryActiveAction } from './actions';
import { createSupabaseStub } from '@/tests/mocks/supabaseClientMock';

describe('admin/categories actions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('createCategory: valida nome mínimo e intervalo de max_nominees', async () => {
    const supabase = createSupabaseStub({ categories: [] } as any);
    vi.spyOn(Auth, 'requireAdmin').mockResolvedValue({ supabase } as any);

    // Nome curto
    let fd = new FormData();
    fd.set('name', 'aa');
    fd.set('max_nominees', '5');
    let res = await createCategory(null as any, fd);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('VALIDATION_NAME_MIN_LENGTH');

    // max inválido
    fd = new FormData();
    fd.set('name', 'Melhor Filme');
    fd.set('max_nominees', '100');
    res = await createCategory(null as any, fd);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('VALIDATION_MAX_RANGE');
  });

  it('createCategory: bloqueia duplicidade case-insensitive e insere com sucesso', async () => {
    const supabase = createSupabaseStub({
      categories: [{ id: 'cat_1', name: 'Melhor Filme', max_nominees: 5, is_active: true }]
    } as any);
    vi.spyOn(Auth, 'requireAdmin').mockResolvedValue({ supabase } as any);

    // Duplicado (case-insensitive)
    let fd = new FormData();
    fd.set('name', 'melhor filme');
    fd.set('max_nominees', '5');
    let res = await createCategory(null as any, fd);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('CATEGORY_NAME_DUPLICATE');

    // Novo
    fd = new FormData();
    fd.set('name', 'Melhor Direção');
    fd.set('max_nominees', '5');
    res = await createCategory(null as any, fd);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data?.id).toBeTruthy();
  });

  it('toggleCategoryActive: atualiza o status e revalida rota', async () => {
    const supabase = createSupabaseStub({
      categories: [{ id: 'cat_1', name: 'Melhor Filme', max_nominees: 5, is_active: false }]
    } as any);
    vi.spyOn(Auth, 'requireAdmin').mockResolvedValue({ supabase } as any);

    const res = await toggleCategoryActive('cat_1', true);
    expect(res.ok).toBe(true);
  });

  it('toggleCategoryActiveAction: lê nextState do FormData e delega ao toggle', async () => {
    const supabase = createSupabaseStub({
      categories: [{ id: 'cat_1', name: 'Melhor Filme', max_nominees: 5, is_active: false }]
    } as any);
    vi.spyOn(Auth, 'requireAdmin').mockResolvedValue({ supabase } as any);

    const fd = new FormData();
    fd.set('id', 'cat_1');
    fd.set('nextState', 'on'); // simula checkbox marcado

    const res = await toggleCategoryActiveAction(null as any, fd);
    expect(res.ok).toBe(true);
  });

  it('editCategory: validações, nome único e atualização bem-sucedida', async () => {
    const supabase = createSupabaseStub({
      categories: [
        { id: 'cat_1', name: 'Melhor Filme', max_nominees: 5, is_active: true },
        { id: 'cat_2', name: 'Melhor Direção', max_nominees: 5, is_active: true }
      ]
    } as any);
    vi.spyOn(Auth, 'requireAdmin').mockResolvedValue({ supabase } as any);

    // Falha: id obrigatório
    let fd = new FormData();
    fd.set('name', 'Novo Nome');
    let res = await editCategory(null as any, fd);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('VALIDATION_ID_REQUIRED');

    // Falha: nome curto
    fd = new FormData();
    fd.set('id', 'cat_1');
    fd.set('name', 'aa');
    res = await editCategory(null as any, fd);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('VALIDATION_NAME_MIN_LENGTH');

    // Falha: duplicado
    fd = new FormData();
    fd.set('id', 'cat_1');
    fd.set('name', 'Melhor Direção');
    res = await editCategory(null as any, fd);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('CATEGORY_NAME_DUPLICATE');

    // Sucesso: atualizar max e is_active
    fd = new FormData();
    fd.set('id', 'cat_1');
    fd.set('max_nominees', '6');
    fd.set('is_active', 'true');
    res = await editCategory(null as any, fd);
    expect(res.ok).toBe(true);
  });
});