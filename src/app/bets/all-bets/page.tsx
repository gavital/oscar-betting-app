'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-toastify';
import { Category, DetailedBet } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function AllBetsPage() {
  const router = useRouter();
  const [bets, setBets] = useState<DetailedBet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Record<string, { full_name: string }>>({});

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }
      
      fetchCategories();
      fetchBets();
    };

    checkAuth();
  }, [router]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      toast.error('Erro ao carregar categorias');
    }
  };

  const fetchBets = async () => {
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
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Obter todos os IDs de usuário únicos
      const userIds = [...new Set(data.map(bet => bet.user_id))];
      
      // Obter informações de todos os usuários de uma vez
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (usersError) throw usersError;

      const usersMap: Record<string, { full_name: string }> = {};
      usersData?.forEach(user => {
        usersMap[user.id] = { full_name: user.full_name || 'Usuário Anônimo' };
      });
      
      setUsers(usersMap);

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

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const filteredBets = selectedCategory === 'all'
    ? bets
    : bets.filter(bet => bet.category_id === selectedCategory);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Apostas de Todos os Participantes</h1>

      <div className="mb-6">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="filter-category">
          Filtrar por Categoria
        </label>
        <select
          id="filter-category"
          value={selectedCategory}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        >
          <option value="all">Todas as categorias</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p>Carregando...</p>
        </div>
      ) : (
        <>
          {filteredBets.length === 0 ? (
            <div className="bg-white shadow-md rounded px-8 py-6">
              <p>Nenhuma aposta encontrada para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="bg-white shadow-md rounded overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indicado</th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredBets.map((bet) => (
                    <tr key={bet.id}>
                      <td className="py-4 px-6 text-sm text-gray-900">{users[bet.user_id]?.full_name || 'Carregando...'}</td>
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