import { createServerSupabaseClient } from '@/lib/supabase/server'
import { setBetsOpen } from './actions'
import { Button } from '@/components/ui/button'
import SettingsBetsForm from './_components/SettingsBetsForm'
import SettingsResultsForm from './_components/SettingsResultsForm'
import { redirect } from 'next/navigation'

export default async function AdminSettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verifica admin (opcional: apenas exibir se já houver requireAdmin no layout)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  const role = (profile?.role ?? 'user').toLowerCase()
  if (role !== 'admin') redirect('/')

  const { data: setting } = await supabase
    .from('app_settings')
    .select('key, value')
    .eq('key', 'bets_open')
    .maybeSingle()

  const open =
    setting?.value === true ||
    setting?.value === 'true' ||
    setting?.value?.toString?.() === 'true' ||
    setting == null // fallback: aberto quando ausente// Leitura results_published
  const { data: publishedSetting } = await supabase
    .from('app_settings')
    .select('key, value')
    .eq('key', 'results_published')
    .maybeSingle()
  const resultsPublished =
    publishedSetting?.value === true ||
    publishedSetting?.value === 'true' ||
    publishedSetting?.value?.toString?.() === 'true' ||
    false // default: não publicado

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">Controle de Apostas</h1>
        <p className="text-sm text-gray-600">
          Altere o estado global das apostas (abertas/fechadas).
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-700">Estado atual:</div>
          {open ? (
            <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
              APOSTAS ABERTAS
            </span>
          ) : (
            <span className="inline-flex items-center text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
              APOSTAS FECHADAS
            </span>
          )}
        </div>

        <SettingsBetsForm currentOpen={!!open} />
      </div>

      <div className="border-t pt-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-700">Publicação dos resultados:</div>
            {resultsPublished ? (
              <span className="inline-flex items-center text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                RESULTADOS PUBLICADOS
              </span>
            ) : (
              <span className="inline-flex items-center text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                RESULTADOS OCULTOS
              </span>
            )}
          </div>

          <SettingsResultsForm currentPublished={!!resultsPublished} />
        </div>
      </div>
    </div>
  )
}