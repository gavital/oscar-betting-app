// src/components/admin/CategoryModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase-client';

interface Category {
  id?: number;
  name: string;
  num_nominees: number;
  is_active: boolean;
}

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: Category; // Categoria para edição (opcional)
  onCategoryChange: (category: Category) => void;
}

const CategoryModal = ({ isOpen, onClose, category, onCategoryChange }: CategoryModalProps) => {
  const [name, setName] = useState(category?.name || '');
  const [numNominees, setNumNominees] = useState(category?.num_nominees || 5);
  const [isActive, setIsActive] = useState(category?.is_active !== undefined ? category.is_active : false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(category?.name || '');
    setNumNominees(category?.num_nominees || 5);
    setIsActive(category?.is_active !== undefined ? category.is_active : false);
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name) {
      setError('O nome da categoria é obrigatório.');
      return;
    }

    try {
      const supabase = createClient();

      if (category?.id) {
        // Editar categoria existente
        const { data, error } = await supabase
          .from('categories')
          .update({ name, num_nominees: numNominees, is_active: isActive })
          .eq('id', category.id)
          .select()
          .single();

        if (error) {
          setError(error.message);
        } else {
          onCategoryChange(data);
          onClose();
        }
      } else {
        // Criar nova categoria
        const { data, error } = await supabase
          .from('categories')
          .insert([{ name, num_nominees: numNominees, is_active: isActive }])
          .select()
          .single();

        if (error) {
          setError(error.message);
        } else {
          onCategoryChange(data);
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
          {category?.id ? 'Editar Categoria' : 'Nova Categoria'}
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
            <label htmlFor="numNominees" className="block text-gray-700 text-sm font-bold mb-2">
              Número de Indicados:
            </label>
            <input
              type="number"
              id="numNominees"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={numNominees}
              onChange={(e) => setNumNominees(Number(e.target.value))}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="isActive" className="block text-gray-700 text-sm font-bold mb-2">
              Ativa:
            </label>
            <input
              type="checkbox"
              id="isActive"
              className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              checked={isActive}
              onChange={() => setIsActive(!isActive)}
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="submit"
            >
              {category?.id ? 'Salvar' : 'Criar'}
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

export default CategoryModal;