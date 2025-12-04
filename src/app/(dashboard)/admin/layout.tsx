// src/app/(dashboard)/admin/layout.tsx
import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { ensureProfile } from '@/lib/auth/ensureProfile';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user, profile } = await ensureProfile();
  if (!user) redirect('/login');

  const role = profile?.role ?? 'user';
  if (role !== 'admin') redirect('/');

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200 pb-5 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo</h1>
          <p className="mt-2 text-sm text-gray-600">
            Gerencie categorias, indicados e vencedores do Oscar
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}