// src/app/(auth)/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { sendResetEmail } from './actions';

type ForgotState =
  | { ok: true }
  | { ok: false; error: { code: string; message: string } }
  | null;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  const [state, formAction, pending] = useActionState(async (_prev: ForgotState, fd: FormData) => {
    // Preenche o FormData com email do input (por segurança)
    if (!fd.get('email')) fd.set('email', email);
    const res = await sendResetEmail(fd);
    return res as any;
  }, null as ForgotState);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success('Verifique seu e-mail', {
        description: 'Enviamos um link para redefinir sua senha.',
      });
      router.push('/login');
      return;
    }
    toast.error('Erro ao solicitar recuperação', {
      description: state.error?.message ?? 'Tente novamente mais tarde.',
    });
  }, [state, router]);

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Esqueci minha senha</h1>
        <p className="mt-2 text-sm text-gray-600">
          Informe seu e-mail para enviarmos um link de redefinição.
        </p>
      </div>

      <form action={formAction} className="space-y-6">
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'Enviando...' : 'Enviar link de redefinição'}
        </Button>
      </form>
    </div>
  );
}