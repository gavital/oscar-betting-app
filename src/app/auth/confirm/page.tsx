// src/app/auth/confirm/page.tsx
'use client'

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase-server';

const ConfirmPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const confirmEmail = async () => {
      const params = new URLSearchParams(window.location.search);
      const token_hash = params.get('token_hash');
      const type = params.get('type');

      if (token_hash && type) {
        try {
          const supabase = createClient();
          const { error } = await supabase.auth.verifyOtp({
            type: type,
            token_hash: token_hash,
          })

          if (error) {
            setError(error.message);
          } else {
            setSuccess(true);
          }
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      } else {
        setError("Token inválido.");
        setLoading(false);
      }
    };

    confirmEmail();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Confirmar Email</h1>
      {loading ? (
        <p>Verificando...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : success ? (
        <p className="text-green-500">Email confirmado com sucesso! Você pode fazer login agora.</p>
      ) : null}
    </div>
  );
};

export default ConfirmPage;