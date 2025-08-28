// src/components/ProtectedRoute.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase-client';
import { useRouter, usePathname } from 'next/navigation';

interface Props {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: Props) => {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState(null);

  useEffect(() => {
    const checkSession = async () => {
      // Se a rota for /register ou /login, não verificar a sessão
      if (pathname === '/register' || pathname === '/login' || pathname === '/auth/forgot-password') {
        setIsLoading(false);
        return;
      }

      const supabase = createClient();
      const { data } = await supabase.auth.getSession();

      if (!data?.session) {
        router.push('/login');
      } else {
        setSession(data.session);
      }
      setIsLoading(false);
    };

    checkSession();
  }, [router, pathname]);

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return <>{children}</>;
};

export default ProtectedRoute;