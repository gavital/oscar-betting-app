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

  let isAdmin = false
  if (user) {
    try {
      const { data: rpcResult, error: rpcErr } = await supabase.rpc('is_admin')
      if (!rpcErr) {
        isAdmin = !!rpcResult
      } else {
        const { data: profile, error: roleErr } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()
        if (!roleErr) {
          isAdmin = String(profile?.role ?? 'user').toLowerCase() === 'admin'
        }
    }
    } catch {}
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} isAdmin={isAdmin} />
      <main id="main-content" className="container mx-auto px-4 py-8">{children}</main>
      <Footer />
    </div>
  )
}