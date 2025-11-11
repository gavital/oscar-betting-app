import { Database } from './database'
import { User } from '@supabase/supabase-js'

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]

  export interface Profile extends Tables<'profiles'> {}

  export interface UserWithProfile extends User {
    profile: Profile
  }
  

export interface CategoryWithNominees extends Tables<'categories'> {
  nominees: Tables<'nominees'>[]
}

export interface BetWithDetails extends Tables<'bets'> {
  category: Tables<'categories'>
  nominee: Tables<'nominees'>
}

export type AppRole = 'user' | 'admin'