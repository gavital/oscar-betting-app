'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-toastify';
import { DetailedBet } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function MyBetsPage() {
  const router = useRouter();
  const [bets, setBets] = useState<DetailedBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [bettingEnabled, setBettingEnabled] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }
      setUserId(session.user.id);

      // Verificar se as apostas estão habilitadas
      const { data: settings, error: settingsError } = await supabase
        .from('settings')
        .select('betting_enabled')
        .single();

      if (settingsError) {
        console.error('Erro ao verificar configurações:', settingsError);
      } else if (settings) {
        setBettingEnabled(settings.betting_enabled);
      }

      fetchUserBets(session.user.id);
    };

    checkAuth();
  }, [router]);

  const fetchUserBets = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bets')
        .select(`
          id, 
          user_id,
          nominee_id,
          category_id,
          created_at,
          updated_at,
          categories(name),
          nominees(name, is_winner)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const detailedBets: DetailedBet[] = data.map(bet => ({
        id: bet.id,
        user_id: bet.user_id,
        nominee_id: bet.nominee_id,
        category_id: bet.category_id,
        category_name: bet.categories.name,
        nominee_name: bet.nominees.name,
        is_winner: bet.nominees.is_winner,
        created_at: bet.created_at,
        updated_at: bet.updated_at,
      }));

      setBets(detailedBets);
    } catch (error) {
      console.error('Erro ao carregar apostas:', error);
      toast.error('Erro ao carregar apostas');
    } finally {
      setLoading(false);
    }
  };

  const handleEditBet = (categoryId: string) => {
    if (!bettingEnabled) {
      toast.error('As apostas estão temporariamente suspensas');
      return;
    }
    
    router.push(`/bets/place-bet?category=${categoryId}`);
  };

  const handleDeleteBet = async (betId: string) => {
    if (!bettingEnabled) {
      toast.error('As apostas estão temporariamente suspensas');
      return;
    }
    
    if (!confirm('Tem certeza que deseja excluir esta aposta?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bets')
        .delete()
        .eq('id', betId)
        .eq('user_id', userId!);

      if (error) throw error;
      
      toast.success('Aposta excluída com sucesso!');
      setBets(bets.filter(bet => bet.id !== betId));
    } catch (error) {
      console.error('Erro ao excluir aposta:', error);
      toast.error('Erro ao excluir aposta');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Minhas Apostas</h1>

      {!bettingEnabled && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>As apostas estão temporariamente suspensas. Você não pode editar ou excluir apostas no momento.</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <p>Carregando...</p>
        </div>
      ) : (
        <>
          {bets.length === 0 ? (
            <div className="bg-white shadow-md rounded px-8 py-6">
              <p>Você ainda não fez nenhuma aposta.</p>
              <button
                onClick={() => router.push('/bets/place-bet')}
                className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Fazer Apostas
              </button>
            </div>
          ) : (
            <div className="bg-white shadow-md rounded overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indicado</th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bets.map((bet) => (
                    <tr key={bet.id}>
                      <td className="py-4 px-6 text-sm text-gray-900">{bet.category_name}</td>
                      <td className="py-4 px-6 text-sm text-gray-900">{bet.nominee_name}</td>
                      <td className="py-4 px-6 text-sm">
                        {bet.is_winner === null ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Pendente
                          </span>
                        ) : bet.is_winner ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Vencedor
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Perdeu
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-sm">
                        <button
                          onClick={() => handleEditBet(bet.category_id)}
                          disabled={!bettingEnabled}
                          className="text-blue-500 hover:text-blue-700 mr-4 disabled:text-gray-400"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteBet(bet.id)}
                          disabled={!bettingEnabled}
                          className="text-red-500 hover:text-red-700 disabled:text-gray-400"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}