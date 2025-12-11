// src/app/(dashboard)/admin/settings/_components/SettingsScrapeSourcesForm.tsx
'use client';

import { useState } from 'react';
import { createScrapeSource, updateScrapeSource, deleteScrapeSource } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ScrapeSource = {
  id: string;
  url: string;
  keywords: string[];
  enabled: boolean;
  source_name?: string | null;
  language?: string | null;
};

export function SettingsScrapeSourcesForm({ sources }: { sources: ScrapeSource[] }) {
  const [form, setForm] = useState<{ url: string; keywords: string; source_name?: string; language?: string }>({
    url: '',
    keywords: '',
  });

  async function onCreate(fd: FormData) {
    const url = (fd.get('url') as string)?.trim();
    const keywordsRaw = (fd.get('keywords') as string) ?? '';
    const source_name = (fd.get('source_name') as string) || undefined;
    const language = (fd.get('language') as string) || undefined;
    const keywords = keywordsRaw.split(',').map((k) => k.trim()).filter(Boolean);

    await createScrapeSource({ url, keywords, source_name, language });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <h3 className="text-lg font-semibold mb-3">Add Global Scrape Source</h3>
        <form action={onCreate} className="space-y-3">
          <div>
            <label className="block text-sm">URL (Lista completa / Página de indicados)</label>
            <Input
              name="url"
              placeholder="https://www.omelete.com.br/oscar-2025/lista-completa-indicados-oscar-2025"
              value={form.url}
              onChange={(e) => setForm((s) => ({ ...s, url: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm">Keywords (opcional, separadas por vírgula)</label>
            <Input
              name="keywords"
              placeholder="Oscar, Indicados, 2025"
              value={form.keywords}
              onChange={(e) => setForm((s) => ({ ...s, keywords: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm">Fonte (opcional)</label>
              <Input name="source_name" placeholder="Omelete" />
            </div>
            <div>
              <label className="block text-sm">Idioma (opcional)</label>
              <Input name="language" placeholder="pt-BR" />
            </div>
          </div>
          <Button type="submit">Adicionar</Button>
        </form>
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="text-lg font-semibold mb-3">Existing Sources</h3>
        <ul className="divide-y">
          {sources.map((s) => (
            <li key={s.id} className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{s.url}</div>
                  <div className="text-xs text-muted-foreground">
                    Enabled: {s.enabled ? 'Yes' : 'No'}
                    {' • '}Keywords: {(s.keywords ?? []).join(', ') || '-'}
                    {s.source_name ? ` • Source: ${s.source_name}` : ''}
                    {s.language ? ` • Lang: ${s.language}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <form
                    action={async (fd: FormData) => {
                      const enabled = fd.get('enabled') === 'on';
                      await updateScrapeSource({ id: s.id, enabled });
                    }}
                    className="flex items-center gap-2"
                  >
                    <label className="text-sm">
                      <input type="checkbox" name="enabled" defaultChecked={s.enabled} /> Enabled
                    </label>
                    <Button type="submit" className="text-sm">Save</Button>
                  </form>
                  <form
                    action={async () => {
                      await deleteScrapeSource(s.id);
                    }}
                  >
                    <Button type="submit" variant="destructive" className="text-sm">Delete</Button>
                  </form>
                </div>
              </div>
            </li>
          ))}
          {sources.length === 0 && <li className="text-muted-foreground">No sources configured</li>}
        </ul>
      </section>
    </div>
  );
}