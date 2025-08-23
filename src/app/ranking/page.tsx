'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-toastify';
import { UserRanking, DetailedBet } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function RankingPage() {
  const router = useRouter();
  const [ranking, setRanking] = useState<UserRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserBets, setShowUserBets] = useState<string | null>(null);
  const [userBets, setUserBets] = useState<DetailedBet[]>([]);
  const [loadingBets, setLoadingBets] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }
      
      fetchRanking();
    };

    checkAuth();
  }, [router]);

  const fetchRanking = async () => {
    setLoading(true);
    try {
      // Essa consulta é complexa e seria melhor implementada com um stored procedure
      // ou uma view materializada no Supabase, mas aqui está uma versão simplificada:
      
      // 1. Obter todas as apostas com o status de vencedor
      const { data: betsData, error: betsError } = await supabase
        .from('bets')
        .select(`
          user_id,
          nominee_id,
          nominees(is_winner)
        `);

      if (betsError) throw betsError;

      // 2. Obter todos os usuários
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, full_name');

      if (usersError) throw usersError;

      // 3. Calcular o ranking
      const userStats: Record<string, { 
        userId: string, 
        fullName: string, 
        correctBets: number, 
        totalBets: number 
      }> = {};

      // Inicializar estatísticas para todos os usuários
      usersData?.forEach(user => {
        userStats[user.id] = {
          userId: user.id,
          fullName: user.full_name || 'Usuário Anônimo',
          correctBets: 0,
          totalBets: 0
        };
      });

      // Contar apostas e acertos
      betsData?.forEach(bet => {
        if (bet.user_id in userStats) {
          userStats[bet.user_id].totalBets++;
          if (bet.nominees.is_winner === true) {
            userStats[bet.user_id].correctBets++;
          }
        }
      });

      // Converter para array e ordenar
      const rankingData = Object.values(userStats)
        .filter(user => user.totalBets > 0) // Mostrar apenas usuários com apostas
        .map(user => ({
          user_id: user.userId,
          full_name: user.fullName,
          correct_bets: user.correctBets,
          total_bets: user.totalBets
        }))
        .sort((a, b) => {
          // Ordenar por número de acertos (decrescente)
          if (b.correct_bets !== a.correct_bets) {
            return b.correct_bets - a.correct_bets;
          }
          // Em caso de empate, ordenar por nome (crescente)
          return a.full_name.localeCompare(b.full_name);
        });

      setRanking(rankingData);
    } catch (error) {
      console.error('Erro ao carregar ranking:', error);
      toast.error('Erro ao carregar ranking');
    } finally {
      setLoading(false);
    }
  };

  const handleViewUserBets = async (userId: string) => {
    if (showUserBets === userId) {
      // Se já estamos mostrando as apostas deste usuário, fechar
      setShowUserBets(null);
      return;
    }

    setShowUserBets(userId);
    setLoadingBets(true);
    
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

      setUserBets(detailedBets);
    } catch (error) {
      console.error('Erro ao carregar apostas do usuário:', error);
      toast.error('Erro ao carregar apostas do usuário');
    } finally {
      setLoadingBets(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Ranking de Usuários</h1>

      {loading ? (
        <div className="text-center py-8">
          <p>Carregando...</p>
        </div>
      ) : (
        <>
          {ranking.length === 0 ? (
            <div className="bg-white shadow-md rounded px-8 py-6">
              <p>Ainda não há usuários no ranking.</p>
            </div>
          ) : (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Pódio</h2>
              <div className="flex flex-wrap justify-center items-end gap-4">
                {ranking.length > 1 && (
                  <div className="w-32 bg-gray-200 rounded-t-lg px-4 pt-2 pb-4 text-center">
                    <div className="text-lg font-semibold">{ranking[1].full_name}</div>
                    <div className="text-5xl font-bold my-2">2°</div>
                    <div className="text-sm">{ranking[1].correct_bets} acertos</div>
                  </div>
                )}
                
                {ranking.length > 0 && (
                  <div className="w-32 bg-yellow-200 rounded-t-lg px-4 pt-2 pb-8 text-center">
                    <div className="text-lg font-semibold">{ranking[0].full_name}</div>
                    <div className="text-5xl font-bold my-2">1°</div>
                    <div className="text-sm">{ranking[0].correct_bets} acertos</div>
                  </div>
                )}
                
                {ranking.length > 2 && (
                  <div className="w-32 bg-orange-200 rounded-t-lg px-4 pt-2 pb-2 text-center">
                    <div className="text-lg font-semibold">{ranking[2].full_name}</div>
                    <div className="text-5xl font-bold my-2">3°</div>
                    <div className="text-sm">{ranking[2].correct_bets} acertos</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white shadow-md rounded overflow-hidden">
            <h2 className="text-xl font-semibold p-4 bg-gray-50">Classificação Completa</h2>
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posição</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acertos</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total de Apostas</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ranking.map((user, index) => (
                  <>
                    <tr key={user.user_id} className={index < 3 ? 'bg-gray-50' : ''}>
                      <td className="py-4 px-6 text-sm text-gray-900">{index + 1}º</td>
                      <td className="py-4 px-6 text-sm text-gray-900">{user.full_name}</td>
                      <td className="py-4 px-6 text-sm text-gray-900">{user.correct_bets}</td>
                      <td className="py-4 px-6 text-sm text-gray-900">{user.total_bets}</td>
                      <td className="py-4 px-6 text-sm">
                        <button
                          onClick={() => handleViewUserBets(user.user_id)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          {showUserBets === user.user_id ? 'Ocultar apostas' : 'Ver apostas'}
                        </button>
                      </td>
                    </tr>
                    {showUserBets === user.user_id && (
                      <tr>
                        <td colSpan={5} className="py-4 px-6">
                          {loadingBets ? (
                            <div className="text-center py-4">
                              <p>Carregando apostas...</p>
                            </div>
                          ) : (
                            <div className="bg-gray-50 p-4 rounded">
                              <h3 className="text-lg font-semibold mb-2">Apostas de {user.full_name}</h3>
                              <table className="min-w-full bg-white border">
                                <thead>
                                  <tr>
                                    <th className="py-2 px-4 border-b">Categoria</th>
                                    <th className="py-2 px-4 border-b">Indicado</th>
                                    <th className="py-2 px-4 border-b">Resultado</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {userBets.map((bet) => (
                                    <tr key={bet.id}>
                                      <td className="py-2 px-4 border-b">{bet.category_name}</td>
                                      <td className="py-2 px-4 border-b">{bet.nominee_name}</td>
                                      <td className="py-2 px-4 border-b">
                                        {bet.is_winner === null ? (
                                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                            Pendente
                                          </span>
                                        ) : bet.is_winner ? (
                                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                            Acertou
                                          </span>
                                        ) : (
                                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                            Errou
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}