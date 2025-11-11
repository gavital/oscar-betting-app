'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleCategoryActive(id: string, current: boolean) {
  const supabase = await createServerSupabaseClient()
  
  await supabase
    .from('categories')
    .update({ is_active: !current })
    .eq('id', id)
  
  revalidatePath('/admin/categories')
}