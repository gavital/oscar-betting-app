import { createServerSupabaseClient } from '@/lib/supabase/server'
import { setBetsOpen } from './actions'
import { Button } from '@/components/ui/button'
import SettingsBetsForm from './_components/SettingsBetsForm'
import SettingsResultsForm from './_components/SettingsResultsForm'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { SettingsRSSFeedsForm } from './_components/SettingsRSSFeedsForm'

export default async function SettingsPage() {
  const adminCheck = await requireAdmin();
  if (!adminCheck?.supabase) {
  return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Unauthorized</h1>
        <p>You must be an admin to access this page.</p>
      </div>
    );
  }
  const { supabase } = adminCheck;

  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .select('id, name')
    .order('name', { ascending: true });

  const { data: feeds, error: feedsErr } = await supabase
    .from('rss_feeds')
    .select('id, category_id, url, keywords, enabled, source_name, language');

  if (catErr || feedsErr) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Error</h1>
        <p>{catErr?.message ?? feedsErr?.message}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <SettingsRSSFeedsForm categories={categories ?? []} feeds={feeds ?? []} />
    </div>
  );
}