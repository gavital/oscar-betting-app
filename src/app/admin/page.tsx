// src/app/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase-client';
import { useRouter } from 'next/navigation';
import CategoryList from '@/components/admin/CategoryList';
import CategoryModal from '@/components/admin/CategoryModal';
import NomineeList from '@/components/admin/NomineeList';
import NomineeForm from '@/components/admin/NomineeForm';
import NomineeImport from '@/components/admin/NomineeImport';

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

const AdminPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [selectedNominee, setSelectedNominee] = useState<Nominee | null>(null);
  const [isNomineeModalOpen, setIsNomineeModalOpen] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Verificar se o usuário tem a role de "admin"
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Erro ao buscar perfil:', error);
        }

        if (profile?.role === 'admin') {
          setIsAdmin(true);
        } else {
          router.push('/'); // Redirecionar para a página inicial se não for admin
        }
      } else {
        router.push('/login'); // Redirecionar para o login se não estiver autenticado
      }

      setIsLoading(false);
    };

    const fetchCategories = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Erro ao buscar categorias:', error);
      } else {
        setCategories(data || []);
      }
    };

    checkAdmin();
    fetchCategories();
  }, [router]);

  useEffect(() => {
    const fetchNominees = async () => {
      if (selectedCategory) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('nominees')
          .select('*')
          .eq('category_id', selectedCategory.id);

        if (error) {
          console.error('Erro ao buscar indicados:', error);
        } else {
          setNominees(data || []);
        }
      } else {
        setNominees([]);
      }
    };

    fetchNominees();
  }, [selectedCategory]);

  const handleOpenCategoryModal = (category?: Category) => {
    setSelectedCategory(category || null);
    setIsCategoryModalOpen(true);
  };

  const handleCloseCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setSelectedCategory(null);
  };

  const handleCategoryChange = (updatedCategory: Category) => {
    // Atualizar a lista de categorias com a categoria alterada
    setCategories((prevCategories) => {
      const categoryIndex = prevCategories.findIndex((cat) => cat.id === updatedCategory.id);
      if (categoryIndex !== -1) {
        // Se a categoria existe, atualizar
        const newCategories = [...prevCategories];
        newCategories[categoryIndex] = updatedCategory;
        return newCategories;
      } else {
        // Se a categoria não existe, adicionar
        return [...prevCategories, updatedCategory];
      }
    });
  };

  const handleToggleActive = async (category: Category) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('categories')
      .update({ is_active: !category.is_active })
      .eq('id', category.id);

    if (error) {
      console.error('Erro ao atualizar categoria:', error);
    } else {
      // Atualizar a lista de categorias localmente
      setCategories((prevCategories) =>
        prevCategories.map((cat) =>
          cat.id === category.id ? { ...cat, is_active: !cat.is_active } : cat
        )
      );
    }
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
  };

  const handleOpenNomineeModal = (nominee?: Nominee) => {
    setSelectedNominee(nominee || null);
    setIsNomineeModalOpen(true);
  };

  const handleCloseNomineeModal = () => {
    setIsNomineeModalOpen(false);
    setSelectedNominee(null);
  };

  const handleNomineeChange = (updatedNominee: Nominee) => {
    // Atualizar a lista de indicados com o indicado alterado
    setNominees((prevNominees) => {
      const nomineeIndex = prevNominees.findIndex((nom) => nom.id === updatedNominee.id);
      if (nomineeIndex !== -1) {
        // Se o indicado existe, atualizar
        const newNominees = [...prevNominees];
        newNominees[nomineeIndex] = updatedNominee;
        return newNominees;
      } else {
        // Se o indicado não existe, adicionar
        return [...prevNominees, updatedNominee];
      }
    });
  };

  const handleNomineesChange = (newNominees: any[]) => {
    setNominees(newNominees);
  };

  const handleDeleteNominee = async (nominee: Nominee) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('nominees')
      .delete()
      .eq('id', nominee.id);

    if (error) {
      console.error('Erro ao excluir indicado:', error);
    } else {
      // Atualizar a lista de indicados localmente
      setNominees((prevNominees) => prevNominees.filter((nom) => nom.id !== nominee.id));
    }
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (!isAdmin) {
    return <div>Acesso negado.</div>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">
        Painel de Administração
      </h1>
      <div className="mb-4">
        <button
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          onClick={() => handleOpenCategoryModal()}
        >
          Nova Categoria
        </button>
      </div>
      <CategoryList
        categories={categories}
        onEdit={handleOpenCategoryModal}
        onToggleActive={handleToggleActive}
        onSelect={handleCategorySelect}
      />
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={handleCloseCategoryModal}
        category={selectedCategory || undefined}
        onCategoryChange={handleCategoryChange}
      />

      {selectedCategory && (
        <div>
          <h2 className="text-2xl font-bold mb-4">
            Gerenciar Indicados - {selectedCategory.name}
          </h2>
          <div className="mb-4">
            <button
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2"
              onClick={() => handleOpenNomineeModal()}
            >
              Novo Indicado
            </button>
          </div>
          <NomineeImport
            category_id={selectedCategory.id}
            onNomineesChange={handleNomineesChange}
          />
          <NomineeList
            nominees={nominees}
            onEdit={handleOpenNomineeModal}
            onDelete={handleDeleteNominee}
          />
          <NomineeForm
            category_id={selectedCategory.id}
            isOpen={isNomineeModalOpen}
            onClose={handleCloseNomineeModal}
            nominee={selectedNominee || undefined}
            onNomineeChange={handleNomineeChange}
          />
        </div>
      )}
    </main>
  );
};

export default AdminPage;