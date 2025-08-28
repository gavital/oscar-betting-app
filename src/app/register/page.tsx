// src/app/register/page.tsx
import RegisterForm from '@/components/RegisterForm';

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">
        Criar Conta
      </h1>
      <RegisterForm />
    </main>
  );
}