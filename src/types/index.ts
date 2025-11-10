import { Database } from './database'

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]

export interface UserWithProfile extends Tables<'profiles'> {
  email: string
}

export interface CategoryWithNominees extends Tables<'categories'> {
  nominees: Tables<'nominees'>[]
}

export interface BetWithDetails extends Tables<'bets'> {
  category: Tables<'categories'>
  nominee: Tables<'nominees'>
}

export type AppRole = 'user' | 'admin'