// src/components/EditBetModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase-client';

interface Category {
  id?: number;
  name: string;
  num_nominees: number;
  is_active: boolean;
}

interface Nominee {
  id?: number;
  name: string;
  category_id: number;
  imdb_id: string | null;
}

interface EditBetModalProps {
  isOpen: boolean;
  onClose: () => void;
  betId: number | null;
  category: Category | null;
  onBetUpdate: (betId: number, nomineeId: number, nomineeName: string) => void;
}

const EditBetModal = ({ isOpen, onClose, betId, category, onBetUpdate }: EditBetModalProps) => {
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [selectedNominee, setSelectedNominee] = useState<Nominee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNominees = async () => {
      if (category) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('nominees')
          .select('*')
          .eq('category_id', category.id);

        if (error) {
          console.error('Erro ao buscar indicados:', error);
          setError('Erro ao buscar indicados.');
        } else {
          setNominees(data || []);
          setSelectedNominee(null); // Resetar a seleção ao carregar novos indicados
        }
      }
      setLoading(false);
    };

    fetchNominees();
  }, [category]);

  const handleNomineeSelect = (nominee: Nominee) => {
    setSelectedNominee(nominee);
  };

  const handleUpdateBet = async () => {
    if (!selectedNominee) {
      setError('Por favor, selecione um novo indicador.');
      return;
    }

    console.log('handleUpdateBet - betId:', betId);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bets')
        .update({ nominee_id: selectedNominee.id })
        .eq('id', betId)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar aposta:', error);
        setError('Erro ao atualizar aposta.');
      } else {
        onBetUpdate(betId!, selectedNominee.id, selectedNominee.name);
        onClose();
      }
    } catch (error: any) {
      console.error('Erro ao atualizar aposta:', error.message);
      setError('Erro ao atualizar aposta.');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium text-gray-900 leading-6">
          Editar Aposta
        </h3>
        {loading && <p>Carregando indicados...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {nominees.length > 0 && (
          <div>
            <h4 className="text-md font-medium text-gray-900 leading-6 mt-4">Selecione um novo indicador:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {nominees.map((nominee) => (
                <button
                  key={nominee.id}
                  className={`bg-white border rounded-md p-2 hover:bg-gray-100 ${selectedNominee?.id === nominee.id ? 'bg-gray-200' : ''}`}
                  onClick={() => handleNomineeSelect(nominee)}
                >
                  {nominee.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mt-4">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            onClick={handleUpdateBet}
          >
            Salvar Alterações
          </button>
          <button
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            onClick={onClose}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditBetModal;