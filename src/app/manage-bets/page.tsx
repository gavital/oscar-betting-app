// src/app/manage-bets/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase-client';
import ProtectedRoute from '@/components/ProtectedRoute';

interface Bet {
  id: number;
  user_id: string;
  category_id: number;
  nominee_id: number;
  category_name: string;
  nominee_name: string;
}

const ManageBetsPage = () => {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBets = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bets')
        .select(`
          id,
          user_id,
          category_id,
          nominee_id,
          categories (name),
          nominees (name)
        `)
        .eq('user_id', supabase.auth.currentUser?.id)

      if (error) {
        console.error('Erro ao buscar apostas:', error);
      } else {
        // Formatar os dados para o tipo Bet
        const formattedBets = data.map(bet => ({
          id: bet.id,
          user_id: bet.user_id,
          category_id: bet.category_id,
          nominee_id: bet.nominee_id,
          category_name: (bet.categories as any)?.name || 'Categoria Desconhecida',
          nominee_name: (bet.nominees as any)?.name || 'Indicado Desconhecido',
        }));
        setBets(formattedBets);
      }
      setLoading(false);
    };

    fetchBets();
  }, []);

  const handleDeleteBet = async (betId: number) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('bets')
      .delete()
      .eq('id', betId);

    if (error) {
      console.error('Erro ao excluir aposta:', error);
      alert('Erro ao excluir aposta.');
    } else {
      // Atualizar a lista de apostas localmente
      setBets((prevBets) => prevBets.filter((bet) => bet.id !== betId));
    }
  };

  if (loading) {
    return <div>Carregando suas apostas...</div>;
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col items-center justify-center min-h-screen py-2">
        <h1 className="text-4xl font-bold mb-8">Gerenciar Apostas</h1>

        {bets.length === 0 ? (
          <p>Você ainda não fez nenhuma aposta.</p>
        ) : (
          <div className="w-full max-w-3xl">
            {bets.map((bet) => (
              <div key={bet.id} className="bg-white shadow-md rounded-lg p-4 mb-4">
                <h2 className="text-2xl font-bold mb-2">{bet.category_name}</h2>
                <p className="text-gray-700">Seu palpite: {bet.nominee_name}</p>
                <button
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4"
                  onClick={() => handleDeleteBet(bet.id)}
                >
                  Excluir Aposta
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default ManageBetsPage;