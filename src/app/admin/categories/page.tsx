'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-toastify';
import { Category } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/lib/hooks/useAdmin';

const categorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  nominees_count: z.number().int().positive('Número de indicados deve ser positivo'),
});

type CategoryForm = z.infer<typeof categorySchema>;

export default function CategoriesAdminPage() {
  const router = useRouter();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchCategories();
    }
  }, [isAdmin]);

  const fetchCategories = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CategoryForm) => {
    setLoading(true);
    try {
      if (editingCategory) {
        // Atualizar categoria
        const { error } = await supabase
          .from('categories')
          .update({
            name: data.name,
            nominees_count: data.nominees_count,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast.success('Categoria atualizada com sucesso!');
      } else {
        // Criar nova categoria
        const { error } = await supabase
          .from('categories')
          .insert({
            name: data.name,
            nominees_count: data.nominees_count,
          });

        if (error) {
          if (error.code === '23505') {
            toast.error('Já existe uma categoria com esse nome');
          } else {
            throw error;
          }
        } else {
          toast.success('Categoria criada com sucesso!');
        }
      }

      reset();
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      toast.error('Erro ao salvar categoria');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setValue('name', category.name);
    setValue('nominees_count', category.nominees_count);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

    setLoading(true);
    try {
      // Verificar se há apostas vinculadas a esta categoria
      const { data: bets, error: checkError } = await supabase
        .from('bets')
        .select('id')
        .eq('category_id', id)
        .limit(1);

      if (checkError) throw checkError;

      if (bets && bets.length > 0) {
        toast.error('Não é possível excluir uma categoria com apostas associadas');
        return;
      }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Categoria excluída com sucesso!');
      fetchCategories();
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      toast.error('Erro ao excluir categoria');
    } finally {
      setLoading(false);
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
      <h1 className="text-2xl font-bold mb-6">Gestão de Categorias</h1>

      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h2 className="text-xl font-semibold mb-4">
          {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
        </h2>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
              Nome da Categoria
            </label>
            <input
              {...register('name')}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="name"
              type="text"
              placeholder="Nome da categoria"
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
            )}
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nominees_count">
              Número de Indicados
            </label>
            <input
              {...register('nominees_count', { valueAsNumber: true })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="nominees_count"
              type="number"
              min="1"
              placeholder="Número de indicados"
            />
            {errors.nominees_count && (
              <p className="text-red-500 text-xs mt-1">{errors.nominees_count.message}</p>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-blue-300"
            >
              {loading ? 'Processando...' : editingCategory ? 'Atualizar' : 'Criar'}
            </button>
            
            {editingCategory && (
              <button
                type="button"
                onClick={() => {
                  setEditingCategory(null);
                  reset();
                }}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8">
        <h2 className="text-xl font-semibold mb-4">Categorias</h2>
        
        {loading && <p>Carregando...</p>}
        
        {!loading && categories.length === 0 && (
          <p>Nenhuma categoria cadastrada.</p>
        )}
        
        {!loading && categories.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="py-2 px-4 border-b border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Número de Indicados
                  </th>
                  <th className="py-2 px-4 border-b border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td className="py-2 px-4 border-b border-gray-200">{category.name}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{category.nominees_count}</td>
                    <td className="py-2 px-4 border-b border-gray-200">
                      <button
                        onClick={() => handleEdit(category)}
                        className="text-blue-500 hover:text-blue-700 mr-4"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="text-red-500 hover:text-red-700"
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
      </div>
    </div>
  );
}