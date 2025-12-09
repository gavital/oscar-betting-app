import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />
      <main id="main-content" className="container mx-auto px-4 py-8">{children}</main>
      <Footer />
    </div>
  )
}