// src/app/(auth)/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Falha ao enviar link');

      toast.success('Verifique seu e-mail', {
        description: 'Enviamos um link para redefinir sua senha.',
      });
      router.push('/login');
    } catch (err: any) {
      toast.error('Erro ao solicitar recuperação', {
        description: err?.message ?? 'Tente novamente mais tarde.',
      });
      console.error('forgot-password error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Esqueci minha senha</h1>
        <p className="mt-2 text-sm text-gray-600">
          Informe seu e-mail para enviarmos um link de redefinição.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar link de redefinição'}
        </Button>
      </form>
    </div>
  );
}