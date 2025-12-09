// src/components/layout/AdminMenu.tsx
'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function AdminMenu() {
  return (
    <Link href="/admin" aria-label="Painel Administrativo">
      <Button variant="ghost">Admin</Button>
      </Link>
  )
}