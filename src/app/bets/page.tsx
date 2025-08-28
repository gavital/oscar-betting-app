// src/app/bets/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase-client';
import ProtectedRoute from '@/components/ProtectedRoute';

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

const BetsPage = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [nominees, setNominees] = useState<Nominee[]>([]);
    const [selectedNominee, setSelectedNominee] = useState<Nominee | null>(null);

    useEffect(() => {
        const fetchCategories = async () => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .eq('is_active', true)
                .order('name', { ascending: true });

            if (error) {
                console.error('Erro ao buscar categorias:', error);
            } else {
                setCategories(data || []);
            }
        };

        fetchCategories();
    }, []);

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
            }
        };

        fetchNominees();
    }, [selectedCategory]);

    const handleCategorySelect = (category: Category) => {
        setSelectedCategory(category);
        setSelectedNominee(null); // Limpar o indicador selecionado ao mudar de categoria
    };

    const handleNomineeSelect = (nominee: Nominee) => {
        setSelectedNominee(nominee);
    };

    const handleSubmit = async () => {
        if (!selectedCategory || !selectedNominee) {
          alert('Por favor, selecione uma categoria e um indicado.');
          return;
        }

        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();

          if (!user) {
            console.error('Usuário não autenticado.');
            alert('Usuário não autenticado. Por favor, faça login novamente.');
            return;
          }

          const { data, error } = await supabase
            .from('bets')
            .insert([{
              user_id: user.id,
              category_id: selectedCategory.id,
              nominee_id: selectedNominee.id
            }]);

          if (error) {
            console.error('Erro ao registrar aposta:', error);
            console.log('Data:', data);
            console.log('Error:', error);
            alert('Erro ao registrar aposta.');
          } else {
            alert('Aposta registrada com sucesso!');
          }
        } catch (error: any) {
          console.error('Erro ao registrar aposta:', error.message);
          alert('Erro ao registrar aposta.');
        }
      };


    return (
        <ProtectedRoute>
            <div className="flex flex-col items-center justify-center min-h-screen py-2">
                <h1 className="text-4xl font-bold mb-8">Registro de Apostas</h1>

                <div className="flex flex-col md:flex-row">
                    <div className="md:w-1/4 pr-4">
                        <h2 className="text-2xl font-bold mb-4">Categorias</h2>
                        <ul>
                            {categories.map((category) => (
                                <li key={category.id} className="mb-2">
                                    <button
                                        className={`text-blue-500 hover:text-blue-700 ${selectedCategory?.id === category.id ? 'font-bold' : ''}`}
                                        onClick={() => handleCategorySelect(category)}
                                    >
                                        {category.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="md:w-3/4">
                        {selectedCategory && (
                            <div>
                                <h2 className="text-2xl font-bold mb-4">Indicados para {selectedCategory.name}</h2>
                                {nominees.length === 0 ? (
                                    <p>Nenhum indicado cadastrado para esta categoria.</p>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {nominees.map((nominee) => (
                                            <div
                                                key={nominee.id}
                                                className={`p-4 border rounded-md cursor-pointer ${selectedNominee?.id === nominee.id ? 'bg-gray-100' : ''}`}
                                                onClick={() => handleNomineeSelect(nominee)}
                                            >
                                                <h3 className="text-lg font-medium">{nominee.name}</h3>
                                                {/* Adicionar imagem do IMDB aqui */}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {selectedCategory && selectedNominee && (
                            <div className="mt-8">
                                <button
                                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                    onClick={handleSubmit}
                                >
                                    Registrar Aposta
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
};

export default BetsPage;