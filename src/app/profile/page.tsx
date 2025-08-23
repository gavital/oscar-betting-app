'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-toastify';
import { UserProfile } from '@/lib/types';
import { useRouter } from 'next/navigation';

const profileSchema = z.object({
  full_name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido').optional(),
  notification_preferences: z.object({
    bet_results: z.boolean().default(true),
    promotions: z.boolean().default(true),
  }),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirmação de senha é obrigatória'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const { register: registerProfile, handleSubmit: handleSubmitProfile, reset: resetProfile, formState: { errors: profileErrors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  const { register: registerPassword, handleSubmit: handleSubmitPassword, reset: resetPassword, formState: { errors: passwordErrors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }
      
      setUserEmail(session.user.email || '');
      fetchUserProfile(session.user.id);
    };

    checkAuth();
  }, [router]);

  const fetchUserProfile = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      setUser(data);
      resetProfile({
        full_name: data.full_name || '',
        notification_preferences: {
          bet_results: data.notification_preferences?.bet_results ?? true,
          promotions: data.notification_preferences?.promotions ?? true,
        }
      });
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      toast.error('Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  };

  const onProfileSubmit = async (data: ProfileForm) => {
    if (!user) return;
    
    setUpdatingProfile(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: data.full_name,
          notification_preferences: data.notification_preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      
      // Atualizar o estado local
      setUser({
        ...user,
        full_name: data.full_name,
        notification_preferences: data.notification_preferences,
        updated_at: new Date().toISOString()
      });
      
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    setUpdatingPassword(true);
    try {
      // Verificar senha atual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: data.currentPassword,
      });

      if (signInError) {
        toast.error('Senha atual incorreta');
        setUpdatingPassword(false);
        return;
      }

      // Atualizar senha
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword
      });

      if (error) throw error;
      
      toast.success('Senha atualizada com sucesso!');
      resetPassword();
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      toast.error('Erro ao atualizar senha');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Meu Perfil</h1>

      {loading ? (
        <div className="text-center py-8">
          <p>Carregando...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white shadow-md rounded px-8 pt-6 pb-8">
            <h2 className="text-xl font-semibold mb-4">Informações Pessoais</h2>
            
            <form onSubmit={handleSubmitProfile(onProfileSubmit)}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="full_name">
                  Nome Completo
                </label>
                <input
                  {...registerProfile('full_name')}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="full_name"
                  type="text"
                  placeholder="Seu nome completo"
                />
                {profileErrors.full_name && (
                  <p className="text-red-500 text-xs mt-1">{profileErrors.full_name.message}</p>
                )}
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Email
                </label>
                <p className="text-gray-700">{userEmail}</p>
                <p className="text-gray-500 text-xs mt-1">
                  Para alterar seu email, entre em contato com o suporte.
                </p>
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Preferências de Notificação
                </label>
                <div className="mt-2">
                  <div className="flex items-center mb-2">
                    <input
                      {...registerProfile('notification_preferences.bet_results')}
                      id="bet_results"
                      type="checkbox"
                      className="mr-2"
                    />
                    <label htmlFor="bet_results" className="text-gray-700">
                      Receber notificações sobre resultados de apostas
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      {...registerProfile('notification_preferences.promotions')}
                      id="promotions"
                      type="checkbox"
                      className="mr-2"
                    />
                    <label htmlFor="promotions" className="text-gray-700">
                      Receber notificações sobre promoções e novidades
                    </label>
                  </div>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={updatingProfile}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-blue-300"
              >
                {updatingProfile ? 'Salvando...' : 'Salvar Informações'}
              </button>
            </form>
          </div>

          <div className="bg-white shadow-md rounded px-8 pt-6 pb-8">
            <h2 className="text-xl font-semibold mb-4">Alterar Senha</h2>
            
            <form onSubmit={handleSubmitPassword(onPasswordSubmit)}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="currentPassword">
                  Senha Atual
                </label>
                <input
                  {...registerPassword('currentPassword')}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="currentPassword"
                  type="password"
                  placeholder="Sua senha atual"
                />
                {passwordErrors.currentPassword && (
                  <p className="text-red-500 text-xs mt-1">{passwordErrors.currentPassword.message}</p>
                )}
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="newPassword">
                  Nova Senha
                </label>
                <input
                  {...registerPassword('newPassword')}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="newPassword"
                  type="password"
                  placeholder="Nova senha"
                />
                {passwordErrors.newPassword && (
                  <p className="text-red-500 text-xs mt-1">{passwordErrors.newPassword.message}</p>
                )}
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">
                  Confirmar Nova Senha
                </label>
                <input
                  {...registerPassword('confirmPassword')}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirmar nova senha"
                />
                {passwordErrors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">{passwordErrors.confirmPassword.message}</p>
                )}
              </div>
              
              <button
                type="submit"
                disabled={updatingPassword}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-blue-300"
              >
                {updatingPassword ? 'Atualizando...' : 'Atualizar Senha'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}