'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/requireAdmin'

// Tipos padronizados
export type ActionError = {
  code:
    | 'VALIDATION_ID_REQUIRED'
    | 'VALIDATION_NAME_MIN_LENGTH'
    | 'VALIDATION_MAX_RANGE'
    | 'VALIDATION_NO_FIELDS'
    | 'AUTH_NOT_AUTHENTICATED'
    | 'AUTH_FORBIDDEN'
    | 'CATEGORY_NOT_FOUND'
    | 'CATEGORY_NAME_DUPLICATE'
    | 'DB_SELECT_ERROR'
    | 'DB_INSERT_ERROR'
    | 'DB_UPDATE_ERROR'
    | 'UNKNOWN_ERROR'
  message: string
  field?: 'id' | 'name' | 'max_nominees' | 'auth' | 'role'
  details?: any
}

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: ActionError }

/**
 * createCategory - server action com logging de diagnóstico para investigar
 * por que campos enviados como "1_name"/"1_max_nominees" não estão sendo lidos.
 */
export async function createCategory(
  _prevState: any,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const adminCheck = await requireAdmin()
  if ('error' in adminCheck) {
    const e = adminCheck.error
    return { ok: false, error: { code: e.code, message: e.message, field: e.field } as any }
  }
  const { supabase } = adminCheck;

  const rawName = formData.get('name')
  const rawMax = formData.get('max_nominees')
  const name = rawName ? String(rawName).trim() : ''
  const parsedMax = rawMax != null ? parseInt(String(rawMax), 10) : null

  if (!name || name.length < 3) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_NAME_MIN_LENGTH',
        message: 'Nome deve ter pelo menos 3 caracteres',
        field: 'name',
        details: { length: name.length },
      },
    }
  }

  const max_nominees = Number.isFinite(parsedMax) ? parsedMax : 5
  if (max_nominees < 1 || max_nominees > 20) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_MAX_RANGE',
        message: 'Número de indicados deve ser entre 1 e 20',
        field: 'max_nominees',
        details: { value: max_nominees },
      },
    }
  }

  
  const { data: existing, error: selectError } = await supabase
    .from('categories')
    .select('id')
    .ilike('name', name)
    .maybeSingle()

  if (selectError) {
    return {
      ok: false,
      error: {
        code: 'DB_SELECT_ERROR',
        message: selectError.message,
        field: 'name'
      }
    }
  }
  if (existing) {
    return {
      ok: false,
      error: {
        code: 'CATEGORY_NAME_DUPLICATE',
        message: 'Categoria já existe',
        field: 'name'
      }
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('categories')
    .insert({ name, max_nominees, is_active: true })
    .select('id')
    .single()

  if (insertError) {
    return {
      ok: false,
      error: {
        code: 'DB_INSERT_ERROR',
        message: insertError.message
      }
    }
  }

  revalidatePath('/admin/categories')

  return { ok: true, data: { id: inserted!.id } }
}

export async function toggleCategoryActive(
  id: string,
  nextState: boolean
): Promise<ActionResult> {
  const adminCheck = await requireAdmin();
  if ('error' in adminCheck) return { ok: false, error: adminCheck.error as any }
  const { supabase } = adminCheck;

  const { error: updateError } = await supabase
    .from('categories')
    .update({ is_active: nextState })
    .eq('id', id)

  if (updateError) {
    return {
      ok: false,
      error: {
        code: 'DB_UPDATE_ERROR',
        message: updateError.message
      }
    }
  }

  revalidatePath('/admin/categories')
  return { ok: true }
}

export async function toggleCategoryActiveAction(
  _prevState: any,
  formData: FormData
): Promise<ActionResult> {
  const id = String(formData.get('id') || '')

  // Checkbox nativo: quando marcado -> "on"; quando desmarcado -> null (não existe key)
  const raw = formData.get('nextState')
  const nextState =
    raw == null
      ? false
      : typeof raw === 'string'
        ? ['true', 'on', '1', 'yes'].includes(raw.toLowerCase())
        : Boolean(raw)

  if (!id) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ID_REQUIRED',
        message: 'ID da categoria é obrigatório',
        field: 'id',
      },
    }
  }

  // Autorização e update tratados em toggleCategoryActive
  return await toggleCategoryActive(id, nextState)
}

type EditCategoryInput = {
  id: string
  name?: string
  max_nominees?: number
  is_active?: boolean
}

// Editar categoria
export async function editCategory(
  _prevState: any,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const adminCheck = await requireAdmin();
  if ('error' in adminCheck) return { ok: false, error: adminCheck.error as any }
  const { supabase } = adminCheck;

  // Helpers para leitura segura de FormData
  const getVal = (key: string) => formData.get(key)

  // Extrai campos
  const rawId = getVal('id') ?? getVal('category_id')
  const rawName = getVal('name')
  const rawMax = getVal('max_nominees') ?? getVal('max')
  const rawActive = getVal('is_active')

  const id = String(rawId ?? '').trim()
  const name = rawName != null ? String(rawName).trim() : undefined
  const max_nominees =
    rawMax != null ? parseInt(String(rawMax), 10) : undefined

  // Converter is_active de checkbox/string para boolean
  const is_active =
    rawActive != null
      ? typeof rawActive === 'string'
        ? ['true', 'on', '1', 'yes'].includes(rawActive.toLowerCase())
        : Boolean(rawActive)
      : undefined

  // Validações
  if (!id) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ID_REQUIRED',
        message: 'ID da categoria é obrigatório.',
        field: 'id',
      },
    }
  }

  if (name !== undefined && name.length < 3) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_NAME_MIN_LENGTH',
        message: 'O nome deve ter pelo menos 3 caracteres.',
        field: 'name',
        details: { length: name.length },
      },
    }
  }

  if (
    max_nominees !== undefined &&
    (!Number.isFinite(max_nominees) || max_nominees < 1 || max_nominees > 20)
  ) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_MAX_RANGE',
        message: 'Número de indicados deve ser entre 1 e 20.',
        field: 'max_nominees',
        details: { value: max_nominees },
      },
    }
  }

  // Confirma que a categoria existe
  const { data: existingCategory, error: findError } = await supabase
    .from('categories')
    .select('id')
    .eq('id', id)
    .single()

  if (findError) {
    return {
      ok: false,
      error: {
        code: 'DB_SELECT_ERROR',
        message: findError.message,
        field: 'id',
      },
    }
  }
  if (!existingCategory) {
    return {
      ok: false,
      error: {
        code: 'CATEGORY_NOT_FOUND',
        message: 'Categoria não encontrada.',
        field: 'id',
      },
    }
  }

  // Nome único (se fornecido) - case-insensitive
  if (name !== undefined) {
    const { data: duplicated, error: dupError } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', name)
      .neq('id', id)
      .maybeSingle()

    if (dupError) {
      return {
        ok: false,
        error: {
          code: 'DB_SELECT_ERROR',
          message: dupError.message,
          field: 'name',
        },
      }
    }
    if (duplicated) {
      return {
        ok: false,
        error: {
          code: 'CATEGORY_NAME_DUPLICATE',
          message: 'Já existe outra categoria com esse nome.',
          field: 'name',
        },
      }
    }
  }

  // Monta payload parcial
  const updatePayload: Partial<EditCategoryInput> = {}
  if (name !== undefined) updatePayload.name = name
  if (max_nominees !== undefined) updatePayload.max_nominees = max_nominees
  if (is_active !== undefined) updatePayload.is_active = is_active

  if (Object.keys(updatePayload).length === 0) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_NO_FIELDS',
        message: 'Nenhum campo para atualizar foi fornecido.',
      },
    }
  }

  // Atualiza
  const { error: updateError } = await supabase
    .from('categories')
    .update(updatePayload)
    .eq('id', id)

  if (updateError) {
    return {
      ok: false,
      error: {
        code: 'DB_UPDATE_ERROR',
        message: updateError.message,
      },
    }
  }

  // Revalida
  revalidatePath('/admin/categories')
  revalidatePath(`/admin/categories/${id}/edit`)

  return { ok: true, data: { id } }

}