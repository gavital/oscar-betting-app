// src/app/(dashboard)/admin/nominees/_components/ImportFromRSSButton.tsx
'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useActionState } from 'react';
import { importNomineesFromRSS } from '../rss/actions';

type State =
  | { ok: true; data: { imported: number; processed: string[]; skipped: { url: string; reason: string; status?: number }[] }; message?: string }
  | { ok: false; error: string; data?: { imported?: number; processed?: string[]; skipped?: { url: string; reason: string; status?: number }[] } }
  | null;

export function ImportFromRSSButton({ categoryId }: { categoryId: string }) {
  const [state, formAction, pending] = useActionState(async (_prev: State, _fd: FormData) => {
    const res = await importNomineesFromRSS(categoryId);
    return res as any;
  }, null as State);

  useEffect(() => {
    if (!state) return;

    if (state.ok) {
      const imported = state.data?.imported ?? 0;
      const processedCount = state.data?.processed?.length ?? 0;
      const skippedCount = state.data?.skipped?.length ?? 0;

      const skippedList = (state.data?.skipped ?? [])
        .slice(0, 5)
        .map(s => `${s.url} (${s.reason}${s.status ? ` ${s.status}` : ''})`)
        .join('\n');

      toast.success(`Importação via RSS concluída`, {
        description: [
          `Importado: ${imported}`,
          `Feeds processados: ${processedCount}`,
          `Feeds ignorados: ${skippedCount}`,
          skippedCount > 0 ? `Ignorados:\n${skippedList}${(state.data?.skipped?.length ?? 0) > 5 ? '\n...' : ''}` : undefined,
        ].filter(Boolean).join('\n'),
      });
    } else {
      const skippedList = (state.data?.skipped ?? [])
        .slice(0, 5)
        .map(s => `${s.url} (${s.reason}${s.status ? ` ${s.status}` : ''})`)
        .join('\n');

      toast.error(`Falha na importação via RSS`, {
        description: [
          state.error ?? 'Erro desconhecido',
          (state.data?.processed?.length ?? 0) ? `Processed: ${state.data?.processed?.length}` : undefined,
          (state.data?.skipped?.length ?? 0) ? `Skipped: ${state.data?.skipped?.length}\n${skippedList}` : undefined,
        ].filter(Boolean).join('\n'),
      });
    }
  }, [state]);

  return (
    <form action={formAction}>
      <Button type="submit" disabled={pending}>
        {pending ? 'Importando...' : 'Importar por RSS'}
      </Button>
    </form>
  );
}