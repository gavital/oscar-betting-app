'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-toastify';
import { Category, Nominee } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function PlaceBetPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [nominees, setNominees] = useState<Record<string, Nominee[]>>({});
  const [loading, setLoading] = useState(true);
  const [savingBet, setSavingBet] = useState(false);
  const [selectedNominees, setSelectedNominees] = useState<Record<string, string>>({});
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
        if (!settings.betting_enabled) {
          toast.info('As apostas estão temporariamente suspensas');
        }
      }

      fetchCategories();
    };

    checkAuth();
  }, [router]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Fetch nominees for all categories
      const nomineesByCategory: Record<string, Nominee[]> = {};
      const fetchPromises = categoriesData?.map(async (category) => {
        const { data: nomineesData, error: nomineesError } = await supabase
          .from('nominees')
          .select('*')
          .eq('category_id', category.id)
          .order('name');

        if (nomineesError) throw nomineesError;
        nomineesByCategory[category.id] = nomineesData || [];
      });

      if (fetchPromises) await Promise.all(fetchPromises);
      setNominees(nomineesByCategory);

      // Fetch user's existing bets
      if (userId) {
        const { data: userBets, error: betsError } = await supabase
          .from('bets')
          .select('category_id, nominee_id')
          .eq('user_id', userId);

        if (betsError) throw betsError;

        const existingBets: Record<string, string> = {};
        userBets?.forEach(bet => {
          existingBets[bet.category_id] = bet.nominee_id;
        });
        setSelectedNominees(existingBets);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleNomineeSelect = (categoryId: string, nomineeId: string) => {
    setSelectedNominees(prev => ({
      ...prev,
      [categoryId]: nomineeId
    }));
  };

  const handleSubmit = async (categoryId: string) => {
    if (!userId) {
      toast.error('Você precisa estar logado para apostar');
      return;
    }

    if (!bettingEnabled) {
      toast.error('As apostas estão temporariamente suspensas');
      return;
    }

    const nomineeId = selectedNominees[categoryId];
    if (!nomineeId) {
      toast.error('Selecione um indicado para apostar');
      return;
    }

    setSavingBet(true);
    try {
      // Verificar se já existe uma aposta para esta categoria
      const { data: existingBet, error: checkError } = await supabase
        .from('bets')
        .select('id')
        .eq('user_id', userId)
        .eq('category_id', categoryId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingBet) {
        // Atualizar aposta existente
        const { error: updateError } = await supabase
          .from('bets')
          .update({
            nominee_id: nomineeId,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingBet.id);

        if (updateError) throw updateError;
        toast.success('Aposta atualizada com sucesso!');
      } else {
        // Criar nova aposta
        const { error: insertError } = await supabase
          .from('bets')
          .insert({
            user_id: userId,
            category_id: categoryId,
            nominee_id: nomineeId
          });

        if (insertError) throw insertError;
        toast.success('Aposta registrada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao salvar aposta:', error);
      toast.error('Erro ao salvar aposta');
    } finally {
      setSavingBet(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Faça suas apostas</h1>

      {loading ? (
        <div className="text-center py-8">
          <p>Carregando...</p>
        </div>
      ) : (
        <>
          {!bettingEnabled && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p>As apostas estão temporariamente suspensas.</p>
            </div>
          )}
          
          {categories.length === 0 ? (
            <p>Nenhuma categoria disponível para apostas.</p>
          ) : (
            categories.map((category) => (
              <div key={category.id} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-6">
                <h2 className="text-xl font-semibold mb-4">{category.name}</h2>
                
                {nominees[category.id]?.length === 0 ? (
                  <p>Nenhum indicado disponível para esta categoria.</p>
                ) : (
                  <>
                    <div className="mb-6">
                      {nominees[category.id]?.map((nominee) => (
                        <div key={nominee.id} className="mb-2">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`category-${category.id}`}
                              value={nominee.id}
                              checked={selectedNominees[category.id] === nominee.id}
                              onChange={() => handleNomineeSelect(category.id, nominee.id)}
                              disabled={!bettingEnabled}
                              className="mr-2"
                            />
                            <span>{nominee.name}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => handleSubmit(category.id)}
                      disabled={!selectedNominees[category.id] || savingBet || !bettingEnabled}
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-blue-300"
                    >
                      {savingBet ? 'Salvando...' : selectedNominees[category.id] ? 'Confirmar Aposta' : 'Selecione um indicado'}
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}