import { createServerSupabaseClient } from '@/lib/supabase/server'
import { importNominees, createNominee, updateNominee, deleteNominee, enrichNomineeWithTMDB } from '../actions'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDeleteNomineeForm } from '../_components/ConfirmDeleteNomineeForm'
import Image from 'next/image'
import { getTmdbImageUrl } from '@/lib/tmdb/client'
import WinnerSetForm from '../_components/WinnerSetForm'
import { importNomineesFromRSS } from '../rss/actions';
import { cookies } from 'next/headers';
import { requireAdmin } from '@/lib/auth/requireAdmin';

type Nominee = {
  id: string;
  name: string;
  tmdb_id?: string | null;
};

export default async function NomineesCategoryPage({ params }: { params: { categoryId: string } }) {
  const { categoryId } = params;

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

  const { data: nominees, error: nomErr } = await supabase
    .from('nominees')
    .select('id, name, tmdb_id')
    .eq('category_id', categoryId)
    .order('name', { ascending: true });

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Error</h1>
        <p>{error.message}</p>
      </div>
    );
  }

  async function onImport() {
    'use server';
    await importNomineesFromRSS(categoryId);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nominees</h1>
        <div className="flex items-center gap-3">
          <form action={onImport}>
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Import from RSS
            </button>
          </form>
          <Link
            href={`/admin/categories`}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Back to Categories
          </Link>
        </div>
        <Link href="/admin/nominees">
          <Button variant="outline">Voltar</Button>
        </Link>
      </div>

      <div className="rounded-lg border border-gray-200">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">TMDB</th>
            </tr>
          </thead>
        </table>
        <div>
          {(nominees ?? []).length === 0 ? (
            <div className="p-4 text-gray-600">No nominees yet</div>
                  ) : (
            <ul className="divide-y">
              {(nominees ?? []).map((n: Nominee) => (
                <li key={n.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span>{n.name}</span>
                    <span className="text-xs text-gray-500">{n.tmdb_id ?? '-'}</span>
                </div>
              </li>
              ))}
        </ul>
          )}
        </div>
      </div>
    </div>
  );
}