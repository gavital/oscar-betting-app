// src/app/auth/reset-password/page.tsx
import ResetPasswordForm from '@/components/ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">
        Redefinir Senha
      </h1>
      <ResetPasswordForm />
    </main>
  );
}