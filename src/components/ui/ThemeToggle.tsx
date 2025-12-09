// src/components/ui/ThemeToggle.tsx
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem('theme')
  if (stored === 'dark' || stored === 'light') return stored as Theme
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const initial = getInitialTheme()
    setTheme(initial)
    document.documentElement.classList.toggle('dark', initial === 'dark')
  }, [])

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    window.localStorage.setItem('theme', next)
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={toggleTheme}
      aria-label={`Alternar para tema ${theme === 'dark' ? 'claro' : 'escuro'}`}
      title={theme === 'dark' ? 'Usando tema escuro' : 'Usando tema claro'}
    >
      {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
    </Button>
  )
}