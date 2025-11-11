'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/**
 * createCategory - server action flexível para aceitar:
 * - Request (await request.formData())
 * - FormData
 * - plain object ({ name, max_nominees })
 *
 * Também encontra chaves com prefixos (ex: "1_name", "0_max_nominees") que o Next pode gerar.
 */
export async function createCategory(input: any) {
  const supabase = await createServerSupabaseClient()

  // --- Normaliza para FormData-like ou objectMap ---
  let fd: FormData | Record<string, any> | null = null

  if (!input) {
    return {
      error:
        'Dados do formulário não recebidos. Certifique-se de que o <form> use action={createCategory} e method="post", e que os inputs tenham name.'
    }
  }

  // Se for um Request-like (Next frequentemente envia assim)
  if (typeof input?.formData === 'function') {
    try {
      fd = await input.formData()
    } catch (err) {
      return { error: 'Falha ao ler os dados do formulário (Request.formData())' }
    }
  } else if (typeof input?.get === 'function') {
    // Já é um FormData
    fd = input
  } else if (typeof input === 'object') {
    // Plain object (e.g., JSON)
    fd = input
  } else {
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

  // Validações
  if (!name || name.length < 3) {
    return { error: 'Nome deve ter pelo menos 3 caracteres' }
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
  // Use .maybeSingle() se disponível; se não, trate erro de "no rows"
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