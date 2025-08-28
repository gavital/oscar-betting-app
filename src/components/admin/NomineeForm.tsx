// src/components/admin/NomineeForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase-client';

interface Nominee {
  id?: number;
  name: string;
  category_id: number;
  imdb_id: string | null;
}

interface NomineeFormProps {
  category_id: number;
  isOpen: boolean;
  onClose: () => void;
  nominee?: Nominee;
  onNomineeChange: (nominee: Nominee) => void;
}

const NomineeForm = ({ category_id, isOpen, onClose, nominee, onNomineeChange }: NomineeFormProps) => {
  const [name, setName] = useState(nominee?.name || '');
  const [imdbId, setImdbId] = useState(nominee?.imdb_id || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(nominee?.name || '');
    setImdbId(nominee?.imdb_id || '');
  }, [nominee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name) {
      setError('O nome do indicado é obrigatório.');
      return;
    }

    try {
      const supabase = createClient();

      if (nominee?.id) {
        // Editar indicado existente
        const { data, error } = await supabase
          .from('nominees')
          .update({ name, category_id, imdb_id: imdbId })
          .eq('id', nominee.id)
          .select()
          .single();

        if (error) {
          setError(error.message);
        } else {
          onNomineeChange(data);
          onClose();
        }
      } else {
        // Criar novo indicado
        const { data, error } = await supabase
          .from('nominees')
          .insert([{ name, category_id, imdb_id: imdbId }])
          .select()
          .single();

        if (error) {
          setError(error.message);
        } else {
          onNomineeChange(data);
          onClose();
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium text-gray-900 leading-6">
          {nominee?.id ? 'Editar Indicado' : 'Novo Indicado'}
        </h3>
        <form onSubmit={handleSubmit} className="mt-4">
          {error && <div className="text-red-500 mb-2">{error}</div>}
          <div className="mb-4">
            <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
              Nome:
            </label>
            <input
              type="text"
              id="name"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="imdbId" className="block text-gray-700 text-sm font-bold mb-2">
              IMDB ID:
            </label>
            <input
              type="text"
              id="imdbId"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={imdbId}
              onChange={(e) => setImdbId(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="submit"
            >
              {nominee?.id ? 'Salvar' : 'Criar'}
            </button>
            <button
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="button"
              onClick={onClose}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NomineeForm;