// src/lib/hooks/useAdmin.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        // Verificar se o usuário está logado
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/auth/login');
          return;
        }

        // Verificar se é admin diretamente
        const { data, error } = await supabase
          .from('user_roles')
          .select('is_admin')
          .eq('user_id', session.user.id)
          .single();

        if (error || !data?.is_admin) {
          router.push('/');
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error('Erro ao verificar status de administrador:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [router]);

  return { isAdmin, loading };
}