'use client'

import { useEffect } from 'react'

export function HighlightAndScroll({ highlightId }: { highlightId?: string }) {
  useEffect(() => {
    if (!highlightId) return

    const el = document.getElementById(`category-${highlightId}`)
    if (!el) return

    // Aplica destaque visual
    el.classList.add('ring-2', 'ring-primary', 'animate-pulse')

    // Rola para o centro
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })

    // Remove a animação após alguns segundos (mantém a ring, se desejar manter)
    const t = setTimeout(() => {
      el.classList.remove('animate-pulse')
    }, 2000)

    // Remove o parâmetro da URL para evitar re-destaque em refresh
    const url = new URL(window.location.href)
    url.searchParams.delete('highlight')
    window.history.replaceState({}, '', url.toString())

    return () => clearTimeout(t)
  }, [highlightId])

  return null
}