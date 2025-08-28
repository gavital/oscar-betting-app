// src/app/auth/forgot-password/page.tsx
import ForgotPasswordForm from '@/components/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">
        Esqueceu a Senha?
      </h1>
      <ForgotPasswordForm />
    </main>
  );
}