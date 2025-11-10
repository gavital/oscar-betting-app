'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) {
        toast({
          title: 'Erro',
          description: 'E-mail ou senha incorretos',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Sucesso!',
        description: 'Login realizado com sucesso.',
      })
      
      router.push('/')
      router.refresh()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Entrar</h1>
        <p className="mt-2 text-sm text-gray-600">
          Bem de volta! Acesse sua conta.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="seu@email.com"
          />
        </div>

        <div>
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="******"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm">
            <Link
              href="/forgot-password"
              className="font-medium text-purple-600 hover:text-purple-500"
            >
              Esqueci minha senha
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Não tem uma conta?{' '}
          <Link href="/register" className="font-medium text-purple-600 hover:text-purple-500">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}