// src/app/(auth)/forgot-password/page.tsx
'use client';

import { useState, useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { sendResetEmail } from '@/app/(auth)/forgot/actions';

type ForgotState =
  | { ok: true }
  | { ok: false; error: { code: string; message: string } }
  | null;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const [state, formAction, pending] = useActionState(async (_prev: ForgotState, fd: FormData) => {
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
      // inicia cooldown de 30s para evitar reenvios
      setCooldown(30);
      const interval = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      const timeout = setTimeout(() => {
        clearInterval(interval);
      }, 30000);

      // opcional: redirecionar após alguns segundos
      router.push('/login');

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
    toast.error('Erro ao solicitar recuperação', {
      description: state.error?.message ?? 'Tente novamente mais tarde.',
    });
  }, [state, router]);

  const isDisabled = pending || cooldown > 0;
  const ctaLabel = pending ? 'Enviando...' : cooldown > 0 ? `Aguarde ${cooldown}s` : 'Enviar link de redefinição';

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Esqueci minha senha</h1>
        <p className="mt-2 text-sm text-gray-600">
          Informe seu e-mail para enviarmos um link de redefinição.
        </p>
      </div>

      <form action={formAction} className="space-y-6" aria-describedby="helper-text">
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
          <p id="helper-text" className="text-xs text-gray-500 mt-1">
            Vamos enviar um link de redefinição para o e-mail informado.
          </p>
        </div>
        <Button type="submit" className="w-full" disabled={isDisabled} aria-disabled={isDisabled}>
          {ctaLabel}
        </Button>
      </form>
    </div>
  );
}