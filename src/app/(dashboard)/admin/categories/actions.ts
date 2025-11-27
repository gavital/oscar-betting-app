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

/**
 * editCategory - server action para editar categorias
 * Requisitos:
 * - Edita nome e max_nominees
 * - Valida nome único (sem duplicar com outras categorias)
 * - Restringe a admins
 * - Revalida a listagem e página de edição
 * - Retorna { success | error } sem redirect
 */
export async function editCategory(input: any) {
  const supabase = await createServerSupabaseClient()

  // Normaliza input para FormData ou objeto
  let fd: FormData | Record<string, any> = input
  if (typeof input?.formData === 'function') {
    fd = await input.formData()
  }

  const getVal = (key: string) =>
    typeof (fd as any).get === 'function'
      ? (fd as FormData).get(key)
      : (fd as Record<string, any>)[key]

  // Extrai campos
  const rawId = getVal('id') ?? getVal('category_id')
  const rawName = getVal('name')
  const rawMax = getVal('max_nominees') ?? getVal('max')
  const rawActive = getVal('is_active')

  const id = String(rawId ?? '').trim()
  const name = rawName != null ? String(rawName).trim() : undefined
  const max_nominees =
    rawMax != null ? parseInt(String(rawMax), 10) : undefined

  // Converter is_active de entradas típicas de form (checkbox/radio/string)
  const is_active =
    rawActive != null
      ? typeof rawActive === 'string'
        ? ['true', 'on', '1', 'yes'].includes(rawActive.toLowerCase())
        : Boolean(rawActive)
      : undefined

  // Validação: id obrigatório
  if (!id) {
    return { error: 'ID da categoria é obrigatório' }
  }

  // Validações de campos se fornecidos
  if (name !== undefined && name.length < 3) {
    return { error: 'Nome deve ter pelo menos 3 caracteres' }
  }
  if (
    max_nominees !== undefined &&
    (!Number.isFinite(max_nominees) || max_nominees < 1 || max_nominees > 20)
  ) {
    return { error: 'Número de indicados deve ser entre 1 e 20' }
  }

  // Verifica usuário e role admin
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

  // Confirma que a categoria existe
  const { data: existingCategory, error: findError } = await supabase
    .from('categories')
    .select('id')
    .eq('id', id)
    .single()

  if (findError) {
    return { error: findError.message }
  }
  if (!existingCategory) {
    return { error: 'Categoria não encontrada' }
  }

  // Nome único: se nome fornecido, checa duplicidade em outra categoria
  if (name !== undefined) {
    const { data: duplicated, error: dupError } = await supabase
      .from('categories')
      .select('id')
      .eq('name', name)
      .neq('id', id)
      .maybeSingle()

    if (dupError) {
      return { error: dupError.message }
    }
    if (duplicated) {
      return { error: 'Já existe outra categoria com esse nome' }
    }
  }

  // Monta payload de atualização apenas com campos presentes
  const updatePayload: Partial<EditCategoryInput> = {}
  if (name !== undefined) updatePayload.name = name
  if (max_nominees !== undefined) updatePayload.max_nominees = max_nominees
  if (is_active !== undefined) updatePayload.is_active = is_active

  if (Object.keys(updatePayload).length === 0) {
    return { error: 'Nenhum campo para atualizar foi fornecido' }
  }

  // Atualiza
  const { error: updateError } = await supabase
    .from('categories')
    .update(updatePayload)
    .eq('id', id)

  if (updateError) {
    return { error: updateError.message }
  }

  // Revalida listagem e (opcional) página de edição
  revalidatePath('/admin/categories')
  revalidatePath(`/admin/categories/${id}/edit`)

  return { success: true }
}
