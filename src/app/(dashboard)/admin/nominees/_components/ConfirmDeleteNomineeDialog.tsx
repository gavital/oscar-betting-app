'use client';

import { useState } from 'react';
import { deleteNominee } from '../actions';
import { Button } from '@/components/ui/button';

type Props = { id: string };

export default function ConfirmDeleteNomineeDialog({ id }: Props) {
  const [open, setOpen] = useState(false);

  async function onConfirm() {
    const fd = new FormData();
    fd.append('id', id);
    await deleteNominee(fd);
    setOpen(false);
  }

  return (
    <>
      <Button variant="destructive" className="text-sm" type="button" onClick={() => setOpen(true)}>
        Excluir
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />

          {/* Dialog */}
          <div className="relative z-10 w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Confirmar exclusão</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Tem certeza que deseja remover este indicado? Esta ação não pode ser desfeita.
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" type="button" onClick={onConfirm}>
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}