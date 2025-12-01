// src/lib/__mocks__/supabase.ts
export function createServerSupabaseClient() {
    return {
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' }}}) },
      from: () => ({
        select: () => ({ data: [], error: null }),
        insert: () => ({ data: [], error: null }),
        delete: () => ({ data: [], error: null }),
        update: () => ({ data: [], error: null }),
        eq: () => ({ data: [], error: null }),
        single: () => ({ data: null, error: null })
      }),
    };
  }