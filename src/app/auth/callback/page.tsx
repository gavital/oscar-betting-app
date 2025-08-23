// src/app/auth/callback/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Processando autenticação...');
  const [error, setError] = useState(false);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Pegar o código diretamente da URL
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const hash = url.hash;

        // Se houver um hash na URL, isso pode ser uma autenticação de provedor
        if (hash && hash.includes('access_token')) {
          // Processar hash auth (OAuth via redes sociais)
          const { data, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Erro ao obter sessão:', sessionError);
            setError(true);
            setMessage('Erro ao processar autenticação. Por favor, tente novamente.');
            return;
          }

          if (data.session) {
            setMessage('Autenticação bem-sucedida! Redirecionando...');
            setTimeout(() => {
              router.push('/');
              router.refresh();
            }, 2000);
          } else {
            setError(true);
            setMessage('Falha na autenticação. Por favor, tente novamente.');
          }
          return;
        }
        
        if (code) {
          // Trocar o código por uma sessão (confirmação de email)
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('Erro ao processar código de autenticação:', exchangeError);
            setError(true);
            setMessage('Erro ao processar a confirmação de email. Por favor, tente novamente.');
            return;
          }
          
          // Verificar se o usuário está logado agora
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            try {
              // Obter os dados do usuário da sessão
              const userId = session.user.id;
              let fullName = session.user.user_metadata?.full_name || '';
              
              // Verificar se o perfil já existe
              const { data: existingProfile } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('id', userId)
                .single();
              
              // Criar perfil apenas se ainda não existir
              if (!existingProfile) {
                const { error: profileError } = await supabase
                  .from('user_profiles')
                  .insert([{ 
                    id: userId, 
                    full_name: fullName 
                  }]);
                
                if (profileError) {
                  console.error('Erro ao criar perfil:', profileError);
                }
              }
            } catch (profileError) {
              console.error('Erro ao processar perfil:', profileError);
            }
            
            setMessage('Email confirmado! Autenticação bem-sucedida! Redirecionando...');
            
            // Redirecionar para a página inicial após autenticação bem-sucedida
            setTimeout(() => {
              router.push('/');
              router.refresh();
            }, 2000);
          } else {
            setMessage('Email confirmado! Por favor, faça login.');
            
            // Redirecionar para a página de login
            setTimeout(() => {
              router.push('/auth/login');
            }, 2000);
          }
        } else {
          // Nenhum código encontrado, redirecionar para login
          setMessage('Nenhum código de autenticação encontrado. Redirecionando para o login...');
          
          setTimeout(() => {
            router.push('/auth/login');
          }, 2000);
        }
      } catch (err) {
        console.error('Erro inesperado durante o callback:', err);
        setError(true);
        setMessage('Ocorreu um erro inesperado. Por favor, tente novamente.');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className={`text-center p-8 rounded-lg bg-white shadow-md ${error ? 'border-red-300' : ''}`}>
          <h2 className="text-2xl font-bold mb-4">{error ? 'Erro na autenticação' : 'Verificação de Email'}</h2>
          <p className={`${error ? 'text-red-600' : 'text-gray-600'}`}>
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}