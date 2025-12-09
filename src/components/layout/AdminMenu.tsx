// src/components/layout/AdminMenu.tsx
'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function AdminMenu() {
  return (
    <>
      <Link href="/admin/categories" aria-label="Admin: Categorias">
        <Button variant="ghost">Admin: Categorias</Button>
      </Link>
      <Link href="/admin/nominees" aria-label="Admin: Indicados">
        <Button variant="ghost">Admin: Indicados</Button>
      </Link>
      <Link href="/admin/settings" aria-label="Admin: Controle de Apostas">
        <Button variant="ghost">Admin: Controle de Apostas</Button>
      </Link>
    </>
  )
}