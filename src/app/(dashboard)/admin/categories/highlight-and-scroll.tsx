'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export function HighlightAndScroll({ highlightId }: { highlightId?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  useEffect(() => {
    if (!highlightId) return

    const el = document.getElementById(`category-${highlightId}`)
    if (!el) return

    el.classList.add('ring-2', 'ring-primary', 'animate-pulse')
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })

    const t = setTimeout(() => {
      el.classList.remove('animate-pulse')
    }, 2000)

    const params = new URLSearchParams(searchParams.toString())
    params.delete('highlight')

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.replace(nextUrl)

    return () => clearTimeout(t)
  }, [highlightId, pathname, router, searchParams])

  return null
}