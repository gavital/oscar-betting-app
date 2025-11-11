'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function toggleCategoryActive(id: string, current: boolean) {  
  const supabase = await createServerSupabaseClient()
  
  
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()
  
  if (profile?.role !== 'admin') {
    return { error: 'Acesso negado' }
  }

  // Executa update
  const { error } = await supabase
    .from('categories')
    .update({ is_active: !current })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/categories')
  return { success: true }
}

export async function createCategory(formData: FormData) {
  const supabase = await createServerSupabaseClient()
  
  const name = formData.get('name') as string
  const maxNominees = parseInt(formData.get('max_nominees') as string) || 5

  // Validação
  if (!name?.trim() || name.trim().length < 3) {
    return { error: 'Nome deve ter pelo menos 3 caracteres' }
  }

  if (maxNominees < 1 || maxNominees > 20) {
    return { error: 'Número de indicados deve ser entre 1 e 20' }
  }

  // Verifica duplicado
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('name', name.trim())
    .single()

  if (existing) {
    return { error: 'Categoria já existe' }
  }

  // Cria
  const { error: insertError } = await supabase.from('categories').insert({
    name: name.trim(),
    max_nominees: maxNominees,
    is_active: true,
  })

  if (insertError) {
    return { error: insertError.message }
  }

  revalidatePath('/admin/categories')
  redirect('/admin/categories?created=success') // ✅ Redireciona
}