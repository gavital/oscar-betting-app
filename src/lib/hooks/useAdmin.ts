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

        // Verificar se é admin
        const response = await fetch('/api/check-admin');
        
        if (!response.ok) {
          throw new Error('Falha ao verificar status de administrador');
        }
        
        const data = await response.json();
        
        if (!data.isAdmin) {
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