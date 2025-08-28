// src/components/ProtectedRoute.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase-server';
import { useRouter } from 'next/navigation';

interface Props {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: Props) => {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [session, setSession] = useState(null);

  useEffect(() => {
    const checkSession = async () => {
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
  }, [router]);

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return <>{children}</>;
};

export default ProtectedRoute;