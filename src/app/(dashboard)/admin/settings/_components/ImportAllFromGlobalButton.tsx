// src/app/(dashboard)/admin/settings/_components/ImportAllFromGlobalButton.tsx
'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useActionState } from 'react';
import { importFromGlobalScrape } from '../../nominees/scrape/actions';

type SummaryItem = { category: string; category_id?: string; imported: number };
type State =
  | { ok: true; data: { totalImported: number; summary: SummaryItem[]; processed: string[]; skipped: { url: string; reason: string }[] } }
  | { ok: false; error: string }
  | null;

export function ImportAllFromGlobalButton() {
  const [state, formAction, pending] = useActionState(async (_prev: State, _fd: FormData) => {
    // Chama sem categoryId para importar todas
    const res = await importFromGlobalScrape({});
    return res as any;
  }, null as State);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      const total = state.data.totalImported;
      const processedCount = state.data.processed.length;
      const skippedCount = state.data.skipped.length;

      const perCat = state.data.summary
        .filter(s => s.imported > 0)
        .map(s => `${s.category}: +${s.imported}`);

      toast.success('Importação global concluída', {
        description: [
          `Imported total: ${total}`,
          `Processed sources: ${processedCount}`,
          `Skipped sources: ${skippedCount}`,
          perCat.length > 0 ? `Per category:\n${perCat.join('\n')}` : undefined,
        ].filter(Boolean).join('\n'),
      });
    } else {
      toast.error('Importação global falhou', { description: state.error || 'Erro desconhecido' });
    }
  }, [state]);

  return (
    <form action={formAction}>
      <Button type="submit" disabled={pending}>
        {pending ? 'Importando...' : 'Importar tudo (global)'}
      </Button>
    </form>
  );
}