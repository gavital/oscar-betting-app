// src/app/(dashboard)/profile/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from './ProfileForm'

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, name, role')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    return <div className="text-sm text-red-600">Erro ao carregar perfil: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">Meu Perfil</h1>
        <p className="text-sm text-gray-600">Atualize seu nome e preferências.</p>
      </div>

      <ProfileForm currentName={profile?.name ?? ''} />
    </div>
  )
}