// src/components/admin/CategoryList.tsx
'use client';

import React from 'react';
import { createClient } from '@/utils/supabase-client';

interface Category {
  id: number;
  name: string;
  num_nominees: number;
  is_active: boolean;
}

interface CategoryListProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onToggleActive: (category: Category) => Promise<void>;
  onSelect: (category: Category) => void;
}

const CategoryList = ({ categories, onEdit, onToggleActive, onSelect }: CategoryListProps) => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Lista de Categorias</h2>
      <ul>
        {categories.map((category) => (
          <li key={category.id} className="mb-2">
            <button
              className="text-blue-500 hover:text-blue-700"
              onClick={() => onSelect(category)}
            >
              {category.name}
            </button>
            ({category.num_nominees} indicados) -{' '}
            <label className="inline-flex items-center ml-2">
              <span className="mr-2">Ativa:</span>
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-blue-500"
                checked={category.is_active}
                onChange={() => onToggleActive(category)}
              />
            </label>
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline ml-2"
              onClick={() => onEdit(category)}
            >
              Editar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CategoryList;