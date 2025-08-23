'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ToastContainer } from 'react-toastify';
import { supabase } from '@/lib/supabase/client';
import 'react-toastify/dist/ReactToastify.css';
import '@/styles/globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [user, setUser] = useState<{ id: string; isAdmin: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        try {
          // Verificar o status de administrador usando o novo endpoint
          const response = await fetch('/api/check-admin');
          const data = await response.json();

          setUser({
            id: session.user.id,
            isAdmin: data.isAdmin || false
          });
        } catch (error) {
          console.error('Erro ao verificar status de administrador:', error);
          setUser({
            id: session.user.id,
            isAdmin: false
          });
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    };

    checkAuth();

    // Listener para mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          try {
            // Verificar o status de administrador usando o novo endpoint
            const response = await fetch('/api/check-admin');
            const data = await response.json();

            setUser({
              id: session.user.id,
              isAdmin: data.isAdmin || false
            });
          } catch (error) {
            console.error('Erro ao verificar status de administrador:', error);
            setUser({
              id: session.user.id,
              isAdmin: false
            });
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);


  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  };

  // Verificar se estamos em uma página de autenticação
  const isAuthPage = pathname?.startsWith('/auth/');

  if (isAuthPage) {
    return (
      <html lang="pt-BR">
        <head>
          <title>Oscar Betting App</title>
          <meta name="description" content="Faça suas apostas para o Oscar" />
        </head>
        <body>
          <ToastContainer position="top-right" autoClose={3000} />
          <main>{children}</main>
        </body>
      </html>
    );
  }

  return (
    <html lang="pt-BR">
      <head>
        <title>Oscar Betting App</title>
        <meta name="description" content="Faça suas apostas para o Oscar" />
      </head>
      <body className="bg-gray-100 min-h-screen">
        <ToastContainer position="top-right" autoClose={3000} />
        
        <nav className="bg-indigo-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <Link href="/" className="flex-shrink-0 flex items-center">
                  <span className="text-xl font-bold">Oscar Betting</span>
                </Link>
              </div>

              <div className="hidden md:flex items-center space-x-4">
                {!loading && user && (
                  <>
                    <Link href="/bets/place-bet" className="px-3 py-2 rounded-md hover:bg-indigo-500">
                      Apostar
                    </Link>
                    <Link href="/ranking" className="px-3 py-2 rounded-md hover:bg-indigo-500">
                      Ranking
                    </Link>
                    <Link href="/profile" className="px-3 py-2 rounded-md hover:bg-indigo-500">
                      Perfil
                    </Link>
                    {user.isAdmin && (
                      <Link href="/admin/categories" className="px-3 py-2 rounded-md hover:bg-indigo-500">
                        Admin
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="px-3 py-2 rounded-md bg-red-500 hover:bg-red-600"
                    >
                      Sair
                    </button>
                  </>
                )}
              </div>

              {/* Menu Mobile */}
              <div className="md:hidden flex items-center">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md hover:bg-indigo-500"
                >
                  <span className="sr-only">Abrir menu</span>
                  <svg
                    className="h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {menuOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                {!loading && user && (
                  <>
                    <Link href="/" className="block px-3 py-2 rounded-md hover:bg-indigo-500">
                      Home
                    </Link>
                    <Link href="/bets/place-bet" className="block px-3 py-2 rounded-md hover:bg-indigo-500">
                      Apostar
                    </Link>
                    <Link href="/bets/my-bets" className="block px-3 py-2 rounded-md hover:bg-indigo-500">
                      Minhas Apostas
                    </Link>
                    <Link href="/ranking" className="block px-3 py-2 rounded-md hover:bg-indigo-500">
                      Ranking
                    </Link>
                    <Link href="/profile" className="block px-3 py-2 rounded-md hover:bg-indigo-500">
                      Perfil
                    </Link>
                    {user.isAdmin && (
                      <Link href="/admin/categories" className="block px-3 py-2 rounded-md hover:bg-indigo-500">
                        Admin
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 rounded-md bg-red-500 hover:bg-red-600"
                    >
                      Sair
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </nav>

        <main className="py-4">{children}</main>
        
        <footer className="bg-gray-800 text-white py-6 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-4 md:mb-0">
                <p className="text-center md:text-left">
                  &copy; {new Date().getFullYear()} Oscar Betting App. Todos os direitos reservados.
                </p>
              </div>
              <div className="flex space-x-4">
                <a href="#" className="hover:text-gray-300">Termos de Uso</a>
                <a href="#" className="hover:text-gray-300">Política de Privacidade</a>
                <a href="#" className="hover:text-gray-300">Contato</a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}