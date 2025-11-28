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

    // Prepara a URL sem o parâmetro highlight
    const params = new URLSearchParams(searchParams.toString())
    params.delete('highlight')
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname

    if (!el) {
      // Se não encontrar o elemento, apenas limpe a URL sem alterar o scroll
      router.replace(nextUrl, { scroll: false })
      return
    }

    // Aplica destaque e faz scroll para o card
    el.classList.add('ring-2', 'ring-primary', 'animate-pulse')
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })

    // Garantir foco sem causar novo scroll (melhora a11y) - se der merda, remover
    if (!el.hasAttribute('tabindex')) {
      el.setAttribute('tabindex', '-1')
    }
    el.focus({ preventScroll: true })

    // Remover o destaque e só depois limpar o parâmetro da URL (evita cancelar o timeout)
    const t = setTimeout(() => {
      el.classList.remove('animate-pulse')
      el.classList.remove('ring-2', 'ring-primary')
      // Limpa o parâmetro sem alterar o scroll atual
      router.replace(nextUrl, { scroll: false })
    }, 2500)

    return () => {
      clearTimeout(t)
    }
  }, [searchParams, pathname, router])

  return null
}