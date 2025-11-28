import { createServerSupabaseClient } from '@/lib/supabase/server'
import { setBetsOpen } from './actions'
import { Button } from '@/components/ui/button'

export default async function AdminSettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'bets_open').single()
  const open = setting?.value === true

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Controle de Apostas</h2>
      <p className={`text-sm ${open ? 'text-green-700' : 'text-red-700'}`}>
        {open ? 'APOSTAS ABERTAS' : 'APOSTAS FECHADAS'}
      </p>

      <form action={setBetsOpen}>
        <input type="hidden" name="bets_open" value={open ? 'false' : 'true'} />
        <Button type="submit" variant={open ? 'destructive' : 'default'}>
          {open ? 'ENCERRAR APOSTAS' : 'REABRIR APOSTAS'}
        </Button>
      </form>
    </div>
  )
}