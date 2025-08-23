'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-toastify';
import { Category, Nominee } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/lib/hooks/useAdmin';

export default function RegisterWinnersPage() {
  const router = useRouter();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [categories, setCategories] = useState<Category[]>([]);
  const [nominees, setNominees] = useState<Record<string, Nominee[]>>({});
  const [loading, setLoading] = useState(true);
  const [savingWinner, setSavingWinner] = useState(false);
  const [currentWinners, setCurrentWinners] = useState<Record<string, string>>({});

  useEffect(() => {
    // Fetch categories only if user is admin (this is handled by useAdmin hook)
    if (isAdmin) {
      fetchCategories();
    }
  }, [isAdmin]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Fetch nominees and current winners for all categories
      const nomineesByCategory: Record<string, Nominee[]> = {};
      const winners: Record<string, string> = {};
      
      const fetchPromises = categoriesData?.map(async (category) => {
        const { data: nomineesData, error: nomineesError } = await supabase
          .from('nominees')
          .select('*')
          .eq('category_id', category.id)
          .order('name');

        if (nomineesError) throw nomineesError;
        nomineesByCategory[category.id] = nomineesData || [];
        
        // Check if there's a winner already set
        const winner = nomineesData?.find(nominee => nominee.is_winner);
        if (winner) {
          winners[category.id] = winner.id;
        }
      });

      if (fetchPromises) await Promise.all(fetchPromises);
      
      setNominees(nomineesByCategory);
      setCurrentWinners(winners);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleWinnerSelect = async (categoryId: string, nomineeId: string) => {
    if (savingWinner) return;
    
    setSavingWinner(true);
    try {
      // Reset any previous winner for this category
      if (currentWinners[categoryId]) {
        const { error: resetError } = await supabase
          .from('nominees')
          .update({ is_winner: false })
          .eq('id', currentWinners[categoryId]);
          
        if (resetError) throw resetError;
      }
      
      // Set the new winner
      const { error: updateError } = await supabase
        .from('nominees')
        .update({ is_winner: true })
        .eq('id', nomineeId);
        
      if (updateError) throw updateError;
      
      // Update state
      setCurrentWinners({
        ...currentWinners,
        [categoryId]: nomineeId
      });
      
      toast.success('Vencedor registrado com sucesso!');

      // Optional: Notify users
      // This would involve a serverless function or background job
    } catch (error) {
      console.error('Erro ao registrar vencedor:', error);
      toast.error('Erro ao registrar vencedor');
    } finally {
      setSavingWinner(false);
    }
  };

  if (adminLoading) {
    return <div className="p-8">Verificando permissões...</div>;
  }

  if (!isAdmin) {
    return null; // O hook useAdmin já redirecionará para a página inicial
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Registro de Vencedores</h1>

      {loading ? (
        <div className="text-center py-8">
          <p>Carregando...</p>
        </div>
      ) : (
        <>
          {categories.length === 0 ? (
            <p>Nenhuma categoria disponível.</p>
          ) : (
            categories.map((category) => (
              <div key={category.id} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-6">
                <h2 className="text-xl font-semibold mb-4">
                  {category.name}
                  {currentWinners[category.id] && (
                    <span className="ml-2 text-sm font-normal text-green-600">
                      (Vencedor registrado)
                    </span>
                  )}
                </h2>
                
                {nominees[category.id]?.length === 0 ? (
                  <p>Nenhum indicado disponível para esta categoria.</p>
                ) : (
                  <div className="mb-6">
                    <table className="min-w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Indicado
                          </th>
                          <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ação
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {nominees[category.id]?.map((nominee) => (
                          <tr key={nominee.id}>
                            <td className="py-4 px-6 text-sm text-gray-900">{nominee.name}</td>
                            <td className="py-4 px-6 text-sm">
                              {nominee.is_winner ? (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  Vencedor
                                </span>
                              ) : (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                  Não vencedor
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-sm">
                              <button
                                onClick={() => handleWinnerSelect(category.id, nominee.id)}
                                disabled={nominee.is_winner || savingWinner}
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline disabled:bg-blue-300"
                              >
                                {nominee.is_winner ? 'Selecionado' : 'Definir como vencedor'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}