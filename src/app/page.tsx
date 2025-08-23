'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBets: 0,
    totalCategories: 0
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; name: string; isAdmin: boolean } | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }

      // Verificar se é admin usando o endpoint
      let isAdmin = false;
      try {
        const response = await fetch('/api/check-admin');
        if (response.ok) {
          const data = await response.json();
          isAdmin = data.isAdmin;
        }
      } catch (error) {
        console.error('Erro ao verificar status de administrador:', error);
      }

      // Obter nome do usuário
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single();

      setUser({
        id: session.user.id,
        name: profileData?.full_name || session.user.email || 'Usuário',
        isAdmin: isAdmin
      });

      fetchStats();
    };

    checkAuth();
  }, [router]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Total de usuários
      const { count: usersCount, error: usersError } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true });

      // Total de apostas
      const { count: betsCount, error: betsError } = await supabase
        .from('bets')
        .select('id', { count: 'exact', head: true });

      // Total de categorias
      const { count: categoriesCount, error: categoriesError } = await supabase
        .from('categories')
        .select('id', { count: 'exact', head: true });

      setStats({
        totalUsers: usersCount || 0,
        totalBets: betsCount || 0,
        totalCategories: categoriesCount || 0
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-2">Oscar Betting App</h1>
        <p className="text-xl text-gray-600">Faça suas apostas para o Oscar!</p>
        
        {user && (
          <p className="mt-4 text-lg">
            Bem-vindo(a), <span className="font-semibold">{user.name}</span>!
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-blue-100 p-6 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-bold mb-2">Usuários</h2>
          <p className="text-4xl font-bold text-blue-700">
            {loading ? '...' : stats.totalUsers}
          </p>
        </div>
        
        <div className="bg-green-100 p-6 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-bold mb-2">Apostas</h2>
          <p className="text-4xl font-bold text-green-700">
            {loading ? '...' : stats.totalBets}
          </p>
        </div>
        
        <div className="bg-purple-100 p-6 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-bold mb-2">Categorias</h2>
          <p className="text-4xl font-bold text-purple-700">
            {loading ? '...' : stats.totalCategories}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Links para usuários comuns */}
        <Link href="/bets/place-bet" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-bold mb-2">Fazer Apostas</h2>
          <p className="text-gray-600">Faça suas apostas para as categorias disponíveis.</p>
        </Link>
        
        <Link href="/bets/my-bets" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-bold mb-2">Minhas Apostas</h2>
          <p className="text-gray-600">Veja e gerencie suas apostas registradas.</p>
        </Link>
        
        <Link href="/ranking" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-bold mb-2">Ranking</h2>
          <p className="text-gray-600">Confira o ranking dos apostadores.</p>
        </Link>
        
        <Link href="/bets/all-bets" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-bold mb-2">Todas as Apostas</h2>
          <p className="text-gray-600">Veja as apostas de outros participantes.</p>
        </Link>
        
        <Link href="/profile" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-bold mb-2">Meu Perfil</h2>
          <p className="text-gray-600">Gerencie suas informações pessoais.</p>
        </Link>

        {/* Links adicionais apenas para administradores */}
        {user?.isAdmin && (
          <>
            <div className="md:col-span-2 lg:col-span-3 mt-4">
              <h2 className="text-2xl font-bold mb-4">Administração</h2>
            </div>
            
            <Link href="/admin/categories" className="bg-amber-50 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-bold mb-2">Gerenciar Categorias</h2>
              <p className="text-gray-600">Adicionar, editar ou remover categorias de apostas.</p>
            </Link>
            
            <Link href="/admin/nominees" className="bg-amber-50 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-bold mb-2">Gerenciar Indicados</h2>
              <p className="text-gray-600">Adicionar, editar ou remover indicados nas categorias.</p>
            </Link>
            
            <Link href="/admin/winners" className="bg-amber-50 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-bold mb-2">Registrar Vencedores</h2>
              <p className="text-gray-600">Definir os vencedores de cada categoria.</p>
            </Link>
            
            <Link href="/admin/block-betting" className="bg-amber-50 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-bold mb-2">Controlar Apostas</h2>
              <p className="text-gray-600">Habilitar ou desabilitar a realização de apostas.</p>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}