'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/**
 * createCategory - server action com logging de diagnóstico para investigar
 * por que campos enviados como "1_name"/"1_max_nominees" não estão sendo lidos.
 */
export async function createCategory(input: any) {
  const supabase = await createServerSupabaseClient()

  // --- Normaliza para FormData-like ou objectMap ---
  let fd: FormData | Record<string, any> | null = null

  // Early guard
  if (!input) {
    console.log('[createCategory] input is falsy', { input })
    return {
      error:
        'Dados do formulário não recebidos. Certifique-se de que o <form> use action={createCategory} e method="post", e que os inputs tenham name.'
    }
  }

  // Log tipo inicial
  console.log('[createCategory] typeof input:', typeof input, 'has formData():', typeof input?.formData === 'function', 'has get():', typeof input?.get === 'function')

  // Se for um Request-like (Next frequentemente envia assim)
  if (typeof input?.formData === 'function') {
    try {
      fd = await input.formData()
      console.log('[createCategory] converted Request -> FormData')
      // Mostra entradas do FormData
      try {
        const entries = Array.from((fd as FormData).entries())
        console.log('[createCategory] FormData entries:', entries)
      } catch (e) {
        console.log('[createCategory] erro ao serializar FormData entries:', e)
      }
    } catch (err) {
      console.error('[createCategory] Falha ao ler Request.formData():', err)
      return { error: 'Falha ao ler os dados do formulário (Request.formData())' }
    }
  } else if (typeof input?.get === 'function') {
    // Já é um FormData
    fd = input
    console.log('[createCategory] input already FormData; entries:', Array.from((fd as FormData).entries()))
  } else if (typeof input === 'object') {
    // Plain object (e.g., JSON)
    fd = input
    try {
      console.log('[createCategory] input is plain object:', JSON.stringify(fd))
    } catch (e) {
      console.log('[createCategory] input is plain object (non-serializable):', fd)
    }
  } else {
    console.log('[createCategory] formato inválido de input:', input)
    return { error: 'Formato dos dados do formulário inválido' }
  }

  // --- Extrai name e maxNominees procurando por chaves comuns e por chaves com prefixos ---
  let rawName: any = undefined
  let rawMax: any = undefined

  const isNameKey = (key: string) => {
    const k = key.toLowerCase()
    return (
      k === 'name' ||
      k === 'title' ||
      k.endsWith('_name') ||
      k.endsWith('-name') ||
      k.endsWith('.name') ||
      k.endsWith('name')
    )
  }

  const isMaxKey = (key: string) => {
    const k = key.toLowerCase()
    return (
      k === 'max_nominees' ||
      k === 'maxnominees' ||
      k === 'max' ||
      k.endsWith('_max_nominees') ||
      k.endsWith('_max') ||
      k.endsWith('max_nominees') ||
      k.endsWith('maxnominees') ||
      k.endsWith('max')
    )
  }

  if (typeof (fd as FormData).entries === 'function') {
    // fd é FormData
    for (const [k, v] of (fd as FormData).entries()) {
      // Se v for File/Blob, ignorar
      if (typeof File !== 'undefined' && v instanceof File) continue
      const sval = typeof v === 'string' ? v : String(v ?? '')
      console.log(`[createCategory] entry key=${k} value=${sval}`)
      if (!rawName && isNameKey(k)) rawName = sval
      if (!rawMax && isMaxKey(k)) rawMax = sval
      if (rawName && rawMax) break
    }
  } else {
    // fd é plain object
    for (const k of Object.keys(fd as Record<string, any>)) {
      const v = (fd as Record<string, any>)[k]
      if (v == null) continue
      const sval = typeof v === 'string' ? v : String(v)
      console.log(`[createCategory] object key=${k} value=${sval}`)
      if (!rawName && isNameKey(k)) rawName = sval
      if (!rawMax && isMaxKey(k)) rawMax = sval
      if (rawName && rawMax) break
    }
  }

  // Se ainda não encontrou, tente chaves sem prefixo diretamente (compatibilidade extra)
  if (!rawName) {
    if (typeof (fd as any).get === 'function') {
      rawName = (fd as FormData).get('name') ?? (fd as FormData).get('1_name') ?? (fd as FormData).get('0_name')
    } else {
      rawName = (fd as Record<string, any>)['name'] ?? (fd as Record<string, any>)['1_name'] ?? (fd as Record<string, any>)['0_name']
    }
  }
  if (!rawMax) {
    if (typeof (fd as any).get === 'function') {
      rawMax =
        (fd as FormData).get('max_nominees') ??
        (fd as FormData).get('maxNominees') ??
        (fd as FormData).get('1_max_nominees') ??
        (fd as FormData).get('max')
    } else {
      rawMax =
        (fd as Record<string, any>)['max_nominees'] ??
        (fd as Record<string, any>)['maxNominees'] ??
        (fd as Record<string, any>)['1_max_nominees'] ??
        (fd as Record<string, any>)['max']
    }
  }

  // --- Normaliza valores ---
  const name = rawName ? String(rawName).trim() : ''
  const parsedMax = rawMax !== undefined && rawMax !== null ? parseInt(String(rawMax), 10) : NaN

  console.log('[createCategory] parsed:', { rawName, rawMax, name, parsedMax })

  // Validações
  if (!name || name.length < 3) {
    // Em dev, retorna detalhes para diagnóstico (remova/oculte em produção)
    const debug = { rawName, rawMax, nameLength: name.length }
    console.warn('[createCategory] validação falhou:', debug)
    return { error: 'Nome deve ter pelo menos 3 caracteres', debug }
  }
  const finalMax = Number.isFinite(parsedMax) ? parsedMax : 5
  if (finalMax < 1 || finalMax > 20) {
    return { error: 'Número de indicados deve ser entre 1 e 20' }
  }

  // --- Verifica usuário e role admin ---
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Usuário não autenticado' }
  }
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    return { error: profileError.message || 'Erro ao verificar perfil' }
  }
  if (profile?.role !== 'admin') {
    return { error: 'Acesso negado' }
  }

  // --- Verifica duplicado e insere ---
  const { data: existing, error: selectError } = await supabase
    .from('categories')
    .select('id')
    .eq('name', name)
    .maybeSingle()

  if (selectError) {
    return { error: selectError.message }
  }
  if (existing) {
    return { error: 'Categoria já existe' }
  }

  const { error: insertError } = await supabase.from('categories').insert({
    name,
    max_nominees: finalMax,
    is_active: true,
  })

  if (insertError) {
    return { error: insertError.message }
  }

  revalidatePath('/admin/categories')
  redirect('/admin/categories?created=success')
}

export async function toggleCategoryActive(id: string, nextState: boolean) {
  const supabase = await createServerSupabaseClient()

  // Verifica usuário autenticado
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Usuário não autenticado' }
  }

  // Verifica role admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    return { error: profileError.message || 'Erro ao verificar perfil' }
  }
  if (profile?.role !== 'admin') {
    return { error: 'Acesso negado' }
  }

  // Atualiza estado da categoria
  const { error: updateError } = await supabase
    .from('categories')
    .update({ is_active: nextState })
    .eq('id', id)

  if (updateError) {
    return { error: updateError.message }
  }

  // Revalida a página para refletir mudança
  revalidatePath('/admin/categories')

  return { success: true }
}

type EditCategoryInput = {
  id: string
  name?: string
  max_nominees?: number
  is_active?: boolean
}

type ActionError = {
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
    | 'DB_UPDATE_ERROR'
    | 'UNKNOWN_ERROR'
  message: string
  field?: 'id' | 'name' | 'max_nominees' | 'auth' | 'role'
  details?: any
}

type EditCategoryResult =
  | { ok: true; success: true }
  | { ok: false; error: ActionError }

// ✅ Ajuste: dois parâmetros (prevState, formData) para compatibilidade com useActionState
export async function editCategory(
  _prevState: any,
  formData: FormData
): Promise<EditCategoryResult> {
  const supabase = await createServerSupabaseClient()

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

  // Autenticação / autorização
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      ok: false,
      error: {
        code: 'AUTH_NOT_AUTHENTICATED',
        message: 'Faça login para continuar.',
        field: 'auth',
      },
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    return {
      ok: false,
      error: {
        code: 'DB_SELECT_ERROR',
        message: profileError.message || 'Erro ao verificar perfil.',
        field: 'role',
      },
    }
  }
  if (profile?.role !== 'admin') {
    return {
      ok: false,
      error: {
        code: 'AUTH_FORBIDDEN',
        message: 'Você não tem permissão para editar categorias.',
        field: 'role',
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

  // Nome único (se fornecido)
  if (name !== undefined) {
    const { data: duplicated, error: dupError } = await supabase
      .from('categories')
      .select('id')
      .eq('name', name)
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

  return { ok: true, success: true }
}