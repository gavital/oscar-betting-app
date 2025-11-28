// src/app/(dashboard)/admin/categories/HighlightAndScroll.tsx
'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export function HighlightAndScroll() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const highlightId = searchParams.get('highlight')
    if (!highlightId) return

    const el = document.getElementById(`category-${highlightId}`)
    if (!el) {
      // Limpa a URL mesmo se não achar o elemento
      const params = new URLSearchParams(searchParams.toString())
      params.delete('highlight')
      const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
      router.replace(nextUrl)
      return
    }

    // Aplica destaque e scroll
    el.classList.add('ring-2', 'ring-primary', 'animate-pulse')
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })

    const t = setTimeout(() => {
      el.classList.remove('animate-pulse')
      el.classList.remove('ring-2', 'ring-primary')
    }, 2500)

    // Limpa o parâmetro da URL
    const params = new URLSearchParams(searchParams.toString())
    params.delete('highlight')
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.replace(nextUrl)

    return () => clearTimeout(t)
  }, [searchParams, pathname, router])

  return null
}