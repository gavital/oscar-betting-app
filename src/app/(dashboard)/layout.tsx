import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ // ✅ já é async
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient() // ✅ ADICIONADO await
  
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      <main className="container mx-auto px-4 py-8">{children}</main>
      <Footer />
    </div>
  )
}