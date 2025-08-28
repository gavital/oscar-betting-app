// src/components/ResetPasswordForm.tsx
'use client'

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase-server';
import { useRouter } from 'next/navigation';

const ResetPasswordForm = () => {
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Verificar se o token está presente na URL
    const params = new URLSearchParams(window.location.search);
    const token_hash = params.get('token_hash');

    if (!token_hash) {
      setError("Token inválido.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    try {
      const supabase = createClient();
      const params = new URLSearchParams(window.location.search);
      const token_hash = params.get('token_hash');

      if (!token_hash) {
        setError("Token inválido.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        // Redirecionar para a página de login após a redefinição bem-sucedida
        setTimeout(() => {
          router.push('/login');
        }, 3000); // Redirecionar após 3 segundos
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto mt-8">
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {success && (
        <div className="text-green-500 mb-4">
          Senha redefinida com sucesso! Redirecionando para a página de login...
        </div>
      )}
      <div className="mb-6">
        <label htmlFor="newPassword" className="block text-gray-700 text-sm font-bold mb-2">
          Nova Senha:
        </label>
        <input
          type="password"
          id="newPassword"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
      </div>
      <div className="flex items-center justify-between">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          type="submit"
        >
          Redefinir Senha
        </button>
      </div>
    </form>
  );
};

export default ResetPasswordForm;