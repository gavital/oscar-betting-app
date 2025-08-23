'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-toastify';
import { Category, Nominee } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/lib/hooks/useAdmin';

const nomineeSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  category_id: z.string().min(1, 'Categoria é obrigatória'),
});

type NomineeForm = z.infer<typeof nomineeSchema>;

export default function NomineesAdminPage() {
  const router = useRouter();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingNominee, setEditingNominee] = useState<Nominee | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [nomineeCounts, setNomineeCounts] = useState<Record<string, number>>({});

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<NomineeForm>({
    resolver: zodResolver(nomineeSchema)
  });

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
      
      if (data && data.length > 0) {
        setSelectedCategory(data[0].id);
        await fetchNominees(data[0].id);
        await fetchNomineeCounts();
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  const fetchNomineeCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('nominees')
        .select('category_id')
        .is('is_winner', false);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach(nominee => {
        counts[nominee.category_id] = (counts[nominee.category_id] || 0) + 1;
      });
      setNomineeCounts(counts);
    } catch (error) {
      console.error('Erro ao contar indicados:', error);
    }
  };

  const fetchNominees = async (categoryId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('nominees')
        .select('*')
        .eq('category_id', categoryId)
        .order('name');

      if (error) throw error;
      setNominees(data || []);
    } catch (error) {
      console.error('Erro ao carregar indicados:', error);
      toast.error('Erro ao carregar indicados');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    fetchNominees(categoryId);
  };

  const onSubmit = async (data: NomineeForm) => {
    setLoading(true);
    try {
      const selectedCategoryObj = categories.find(c => c.id === data.category_id);
      if (!selectedCategoryObj) {
        toast.error('Categoria não encontrada');
        return;
      }

      // Verificar se já atingiu o número máximo de indicados
      if (!editingNominee) {
        const currentCount = nomineeCounts[data.category_id] || 0;
        if (currentCount >= selectedCategoryObj.nominees_count) {
          toast.error(`Esta categoria já atingiu o número máximo de ${selectedCategoryObj.nominees_count} indicados`);
          setLoading(false);
          return;
        }
      }

      if (editingNominee) {
        // Atualizar indicado
        const { error } = await supabase
          .from('nominees')
          .update({
            name: data.name,
            category_id: data.category_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingNominee.id);

        if (error) {
          if (error.code === '23505') {
            toast.error('Já existe um indicado com esse nome nesta categoria');
            return;
          }
          throw error;
        }
        toast.success('Indicado atualizado com sucesso!');
      } else {
        // Criar novo indicado
        const { error } = await supabase
          .from('nominees')
          .insert({
            name: data.name,
            category_id: data.category_id,
          });

        if (error) {
          if (error.code === '23505') {
            toast.error('Já existe um indicado com esse nome nesta categoria');
            return;
          }
          throw error;
        }
        toast.success('Indicado criado com sucesso!');
      }

      reset();
      setEditingNominee(null);
      fetchNominees(data.category_id);
      fetchNomineeCounts();
    } catch (error) {
      console.error('Erro ao salvar indicado:', error);
      toast.error('Erro ao salvar indicado');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (nominee: Nominee) => {
    setEditingNominee(nominee);
    setValue('name', nominee.name);
    setValue('category_id', nominee.category_id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este indicado?')) return;

    setLoading(true);
    try {
      // Verificar se há apostas vinculadas a este indicado
      const { data: bets, error: checkError } = await supabase
        .from('bets')
        .select('id')
        .eq('nominee_id', id)
        .limit(1);

      if (checkError) throw checkError;

      if (bets && bets.length > 0) {
        toast.error('Não é possível excluir um indicado com apostas associadas');
        return;
      }

      const { error } = await supabase
        .from('nominees')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Indicado excluído com sucesso!');
      fetchNominees(selectedCategory);
      fetchNomineeCounts();
    } catch (error) {
      console.error('Erro ao excluir indicado:', error);
      toast.error('Erro ao excluir indicado');
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
      <h1 className="text-2xl font-bold mb-6">Gestão de Indicados</h1>

      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h2 className="text-xl font-semibold mb-4">
          {editingNominee ? 'Editar Indicado' : 'Novo Indicado'}
        </h2>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category_id">
              Categoria
            </label>
            <select
              {...register('category_id')}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="category_id"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} ({(nomineeCounts[category.id] || 0)}/{category.nominees_count})
                </option>
              ))}
            </select>
            {errors.category_id && (
              <p className="text-red-500 text-xs mt-1">{errors.category_id.message}</p>
            )}
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
              Nome do Indicado
            </label>
            <input
              {...register('name')}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="name"
              type="text"
              placeholder="Nome do indicado"
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-blue-300"
            >
              {loading ? 'Processando...' : editingNominee ? 'Atualizar' : 'Criar'}
            </button>
            
            {editingNominee && (
              <button
                type="button"
                onClick={() => {
                  setEditingNominee(null);
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
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="filter-category">
            Filtrar por Categoria
          </label>
          <select
            id="filter-category"
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <h2 className="text-xl font-semibold mb-4">Indicados</h2>
        
        {loading && <p>Carregando...</p>}
        
        {!loading && nominees.length === 0 && (
          <p>Nenhum indicado cadastrado para esta categoria.</p>
        )}
        
        {!loading && nominees.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="py-2 px-4 border-b border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="py-2 px-4 border-b border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {nominees.map((nominee) => (
                  <tr key={nominee.id}>
                    <td className="py-2 px-4 border-b border-gray-200">{nominee.name}</td>
                    <td className="py-2 px-4 border-b border-gray-200">
                      {categories.find(c => c.id === nominee.category_id)?.name}
                    </td>
                    <td className="py-2 px-4 border-b border-gray-200">
                      <button
                        onClick={() => handleEdit(nominee)}
                        className="text-blue-500 hover:text-blue-700 mr-4"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(nominee.id)}
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