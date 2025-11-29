// src/app/(auth)/reset-password/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error('Senha muito curta (mínimo 6)');
    if (password !== confirm) return toast.error('Senhas não coincidem');

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success('Senha alterada com sucesso!');
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err: any) {
      toast.error('Erro ao redefinir senha', { description: err?.message ?? 'Tente novamente.' });
      console.error('updateUser error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Redefinir senha</h1>
        <p className="mt-2 text-sm text-gray-600">Crie uma nova senha para sua conta.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="password">Nova senha</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="******"
          />
        </div>

        <div>
          <Label htmlFor="confirm">Confirmar nova senha</Label>
          <Input
            id="confirm"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="******"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar nova senha'}
        </Button>
      </form>
    </div>
  );
}