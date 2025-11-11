'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/**
 * Cria nova categoria.
 * Aceita vários formatos de entrada porque, dependendo de como a action é chamada,
 * o parâmetro pode ser:
 * - FormData (o comportamento padrão de <form method="post">)
 * - Request (quando a framework passar um Request-like)
 * - objeto plain { name, max_nominees } (algumas serializações client podem enviar JSON)
 * - null (tratado defensivamente)
 */
export async function createCategory(formData: any) {
  const supabase = await createServerSupabaseClient()

  if (!formData) {
    return {
      error:
        'Dados do formulário não recebidos. Certifique-se de que o <form> use action={createCategory} e method="post", e que os inputs tenham name.'
    }
  }

  // Se veio um Request-like (possui formData() async), converte para FormData
  if (typeof formData?.formData === 'function') {
    try {
      formData = await formData.formData()
    } catch (err) {
      return { error: 'Falha ao ler os dados do formulário (Request.formData())' }
    }
  }

  // Agora, formData pode ser:
  // - FormData (tem .get)
  // - plain object ({ name: 'x', max_nominees: '5' })
  let nameEntry: any = undefined
  let maxEntry: any = undefined

  if (typeof formData?.get === 'function') {
    // FormData
    nameEntry = formData.get('name')
    maxEntry = formData.get('max_nominees')
  } else if (typeof formData === 'object') {
    // plain object - tentar diferentes chaves comuns
    nameEntry =
      formData.name ??
      formData['name'] ??
      formData.title ?? // fallback se alguém usou outro nome
      undefined

    maxEntry =
      formData.max_nominees ??
      formData['max_nominees'] ??
      formData.maxNominees ??
      formData.max ??
      undefined
  } else {
    return { error: 'Formato dos dados do formulário inválido' }
  }

  // Normaliza os valores de forma segura
  const name = typeof nameEntry === 'string' ? nameEntry.trim() : (nameEntry ? String(nameEntry).trim() : '')
  const maxNominees = parseInt(typeof maxEntry === 'string' ? maxEntry : String(maxEntry ?? ''), 10) || 5

  // Validação básica
  if (!name || name.length < 3) {
    return { error: 'Nome deve ter pelo menos 3 caracteres' }
  }

  if (maxNominees < 1 || maxNominees > 20) {
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

  // Verifica duplicado (trim aplicado)
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

  // Cria
  const { error: insertError } = await supabase.from('categories').insert({
    name,
    max_nominees: maxNominees,
    is_active: true,
  })

  if (insertError) {
    return { error: insertError.message }
  }

  revalidatePath('/admin/categories')
  redirect('/admin/categories?created=success')
}