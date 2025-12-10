'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SettingsInternalFeed({ year }: { year: number }) {
  const [summary, setSummary] = useState<{
    itemsCount: number;
    processedCount: number;
    skippedCount: number;
    processed: string[];
    skipped: { url: string; reason: string }[];
  } | null>(null);

  const feedUrl = `/api/rss/omelete/${year}`;

  async function onUpdateNow() {
    try {
      const res = await fetch(`${feedUrl}?format=json`, { cache: 'no-store' });
      const data = await res.json();
      if (!data.ok) {
        setSummary(null);
        alert(`Falha: ${data.error || 'Erro desconhecido'}`);
        return;
      }
      setSummary({
        itemsCount: data.summary?.itemsCount ?? 0,
        processedCount: data.summary?.processedCount ?? 0,
        skippedCount: data.summary?.skippedCount ?? 0,
        processed: data.processed ?? [],
        skipped: data.skipped ?? [],
      });
    } catch (err: any) {
      setSummary(null);
      alert(`Erro de rede: ${err?.message ?? 'unknown'}`);
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(window.location.origin + feedUrl).catch(() => {});
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="block text-sm">Feed URL (RSS)</label>
          <div className="flex gap-2">
            <Input readOnly value={typeof window === 'undefined' ? feedUrl : window.location.origin + feedUrl} />
            <Button type="button" onClick={copyToClipboard}>Copiar</Button>
            <a href={feedUrl} target="_blank" rel="noreferrer">
              <Button type="button" variant="outline">Abrir</Button>
            </a>
          </div>
          <div className="text-xs text-muted-foreground">JSON: {feedUrl}?format=json</div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm">Ações</label>
          <div className="flex gap-2">
            <Button type="button" onClick={onUpdateNow}>Atualizar agora</Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Executa o scraper do Omelete e exibe um resumo abaixo
          </div>
        </div>
      </div>

      {summary && (
        <div className="rounded border p-3">
          <div className="text-sm font-semibold mb-2">Resumo</div>
          <ul className="text-sm space-y-1">
            <li>Itens extraídos: {summary.itemsCount}</li>
            <li>Fontes processadas: {summary.processedCount}</li>
            <li>Fontes ignoradas: {summary.skippedCount}</li>
          </ul>

          {summary.skipped.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-semibold">Ignoradas (primeiras 5)</div>
              <ul className="text-xs text-muted-foreground list-disc ml-4">
                {summary.skipped.slice(0, 5).map((s, i) => (
                  <li key={i}>{s.url} — {s.reason}</li>
                ))}
                {summary.skipped.length > 5 && <li>...</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}