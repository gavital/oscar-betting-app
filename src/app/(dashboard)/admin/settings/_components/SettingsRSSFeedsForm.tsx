// src/app/(dashboard)/admin/settings/_components/SettingsRSSFeedsForm.tsx
'use client';

import { useState } from 'react';
import { createRssFeed, updateRssFeed, deleteRssFeed } from '../actions';

type Category = { id: string; name: string };
type RssFeed = {
  id: string;
  category_id: string;
  url: string;
  keywords: string[];
  enabled: boolean;
  source_name?: string | null;
  language?: string | null;
};

export function SettingsRSSFeedsForm({
  categories,
  feeds,
}: {
  categories: Category[];
  feeds: RssFeed[];
}) {
  const [form, setForm] = useState<{
    categoryId: string;
    url: string;
    keywords: string;
    source_name?: string;
    language?: string;
  }>({ categoryId: categories[0]?.id ?? '', url: '', keywords: '' });

  async function onCreate(formData: FormData) {
    const categoryId = formData.get('categoryId') as string;
    const url = formData.get('url') as string;
    const keywordsRaw = (formData.get('keywords') as string) ?? '';
    const source_name = (formData.get('source_name') as string) || undefined;
    const language = (formData.get('language') as string) || undefined;

    const keywords = keywordsRaw
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);

    await createRssFeed({ categoryId, url, keywords, source_name, language });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-3">Adicionar RSS Feed</h2>
        <form action={onCreate} className="space-y-3">
          <div>
            <label className="block text-sm">Categoria</label>
            <select
              name="categoryId"
              value={form.categoryId}
              onChange={e => setForm(s => ({ ...s, categoryId: e.target.value }))}
              className="mt-1 w-full rounded border px-2 py-1"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm">Feed URL</label>
            <input
              name="url"
              value={form.url}
              onChange={e => setForm(s => ({ ...s, url: e.target.value }))}
              placeholder="https://example.com/rss.xml"
              className="mt-1 w-full rounded border px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm">Keywords (separados por vírgula)</label>
            <input
              name="keywords"
              value={form.keywords}
              onChange={e => setForm(s => ({ ...s, keywords: e.target.value }))}
              placeholder="Oscar, Indicados, Melhor Filme"
              className="mt-1 w-full rounded border px-2 py-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm">Nome da fonte (opcional)</label>
              <input
                name="source_name"
                placeholder="Omelete"
                className="mt-1 w-full rounded border px-2 py-1"
              />
            </div>
            <div>
              <label className="block text-sm">Idioma (opcional)</label>
              <input
                name="language"
                placeholder="pt-BR"
                className="mt-1 w-full rounded border px-2 py-1"
              />
            </div>
          </div>
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Adicionar Feed
          </button>
        </form>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-3">Feeds Existentes</h2>
        <ul className="divide-y">
          {feeds.map(f => (
            <li key={f.id} className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{f.url}</div>
                  <div className="text-xs text-gray-500">
                    Categoria: {categories.find(c => c.id === f.category_id)?.name ?? f.category_id}
                    {' • '}Habilitado: {f.enabled ? 'Yes' : 'No'}
                    {' • '}Keywords: {(f.keywords ?? []).join(', ') || '-'}
                    {f.source_name ? ` • Fonte: ${f.source_name}` : ''}
                    {f.language ? ` • Idioma: ${f.language}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <form
                    action={async (fd: FormData) => {
                      const enabled = fd.get('enabled') === 'on';
                      await updateRssFeed({ id: f.id, enabled });
                    }}
                    className="flex items-center gap-2"
                  >
                    <label className="text-sm">
                      <input type="checkbox" name="enabled" defaultChecked={f.enabled} /> Enabled
                    </label>
                    <button
                      type="submit"
                      className="rounded bg-blue-600 px-3 py-1 text-white text-sm"
                    >
                      Save
                    </button>
                  </form>
                  <form
                    action={async () => {
                      await deleteRssFeed(f.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded bg-red-600 px-3 py-1 text-white text-sm"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
          {feeds.length === 0 && <li className="text-gray-600">No feeds configured</li>}
        </ul>
      </section>
    </div>
  );
}