// src/app/(dashboard)/admin/nominees/_components/ImportFromGlobalPageButton.tsx
'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useActionState } from 'react';
import { importFromGlobalScrape } from '../scrape/actions';

type SummaryItem = { category: string; category_id?: string; imported: number };
type State =
  | { ok: true; data: { totalImported: number; summary: SummaryItem[]; processed: string[]; skipped: { url: string; reason: string }[] } }
  | { ok: false; error: string }
  | null;

export function ImportFromGlobalPageButton({ categoryId }: { categoryId?: string }) {
  const [state, formAction, pending] = useActionState(async (_prev: State, _fd: FormData) => {
    const res = await importFromGlobalScrape({ categoryId });
    return res as any;
  }, null as State);

  useEffect(() => {
    if (!state) return;

    if (state.ok) {
      const total = state.data.totalImported;
      const processedCount = state.data.processed.length;
      const skippedCount = state.data.skipped.length;

      const lines: string[] = [];
      lines.push(`Imported total: ${total}`);
      lines.push(`Processed sources: ${processedCount}`);
      lines.push(`Skipped sources: ${skippedCount}`);

      const perCat = state.data.summary
        .filter(s => s.imported > 0)
        .map(s => `${s.category}: +${s.imported}`);
      if (perCat.length > 0) {
        lines.push(`Per category:\n${perCat.join('\n')}`);
      }

      toast.success('Global page import complete', { description: lines.join('\n') });
    } else {
      toast.error('Global page import failed', { description: state.error || 'Unknown error' });
    }
  }, [state]);

  return (
    <form action={formAction}>
      <Button type="submit" disabled={pending}>
        {pending ? 'Importando...' : 'Import from Global Page'}
      </Button>
    </form>
  );
}