'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-toastify';
import { BettingSettings } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/lib/hooks/useAdmin';

export default function BlockBettingPage() {
  const router = useRouter();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [settings, setSettings] = useState<BettingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
    }
  }, [isAdmin]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const toggleBettingStatus = async () => {
    if (!settings) return;
    
    setUpdating(true);
    try {
      const newStatus = !settings.betting_enabled;
      
      const { error } = await supabase
        .from('settings')
        .update({
          betting_enabled: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (error) throw error;
      
      setSettings({
        ...settings,
        betting_enabled: newStatus
      });
      
      toast.success(`Apostas ${newStatus ? 'habilitadas' : 'desabilitadas'} com sucesso!`);
      
      // Notificar usuários (isso seria implementado com uma função serverless)
    } catch (error) {
      console.error('Erro ao atualizar status das apostas:', error);
      toast.error('Erro ao atualizar status das apostas');
    } finally {
      setUpdating(false);
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
      <h1 className="text-2xl font-bold mb-6">Controle de Apostas</h1>

      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        {loading ? (
          <div className="text-center py-4">
            <p>Carregando...</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Status atual</h2>
              <div className={`p-4 rounded ${settings?.betting_enabled ? 'bg-green-100' : 'bg-red-100'}`}>
                <p className="text-lg">
                  As apostas estão atualmente 
                  <span className={`font-bold ${settings?.betting_enabled ? 'text-green-700' : 'text-red-700'}`}>
                    {settings?.betting_enabled ? ' HABILITADAS' : ' DESABILITADAS'}
                  </span>.
                </p>
                <p className="mt-2 text-sm">
                  {settings?.betting_enabled 
                    ? 'Os usuários podem registrar, editar e excluir suas apostas.'
                    : 'Os usuários não podem registrar, editar ou excluir apostas.'}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <button
                onClick={toggleBettingStatus}
                disabled={updating}
                className={`py-3 px-6 font-bold text-white rounded-lg ${
                  settings?.betting_enabled
                    ? 'bg-red-500 hover:bg-red-700'
                    : 'bg-green-500 hover:bg-green-700'
                } disabled:opacity-50`}
              >
                {updating ? 'Processando...' : settings?.betting_enabled ? 'Desabilitar Apostas' : 'Habilitar Apostas'}
              </button>
              
              {settings?.betting_enabled && (
                <p className="mt-4 text-sm text-gray-600 text-center">
                  Desabilite as apostas quando a cerimônia do Oscar começar para garantir a integridade da competição.
                </p>
              )}
              
              {!settings?.betting_enabled && (
                <p className="mt-4 text-sm text-gray-600 text-center">
                  Habilite as apostas apenas se for necessário permitir alterações.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}