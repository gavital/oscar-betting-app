// src/lib/hooks/useAdmin.ts
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-toastify';

export function useAdmin() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        // Verificar se o usuário está logado
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/auth/login');
          return;
        }

        setUserId(session.user.id);

        // Verificar se é admin diretamente pelo Supabase
        const { data, error } = await supabase
          .from('user_roles')
          .select('is_admin')
          .eq('user_id', session.user.id)
          .single();

        if (error) {
          console.error("Erro ao verificar status de admin:", error);
          toast.error("Erro ao verificar permissões");
          router.push('/');
          return;
        }
        
        if (!data?.is_admin) {
          toast.error('Acesso restrito a administradores');
          router.push('/');
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error('Erro ao verificar status de administrador:', error);
        toast.error('Erro ao verificar permissões');
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [router]);

  return { isAdmin, loading, userId };
}