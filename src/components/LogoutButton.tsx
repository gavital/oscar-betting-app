// src/components/LogoutButton.tsx
'use client';

import React from 'react';
import { createClient } from '@/utils/supabase-server';
import { useRouter } from 'next/navigation';

const LogoutButton = () => {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <button
      className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
      onClick={handleLogout}
    >
      Logout
    </button>
  );
};

export default LogoutButton;