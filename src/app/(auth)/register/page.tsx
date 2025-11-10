'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem',
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter pelo menos 6 caracteres',
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    try {
      // Cria usuário com email e senha
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: 'user', // Role padrão
          },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
      })

      if (error) {
        if (error.message.includes('already exists')) {
          toast({
            title: 'Erro',
            description: 'Este e-mail já está cadastrado',
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Erro',
            description: error.message,
            variant: 'destructive',
          })
        }
        return
      }

      // Sucesso - redireciona para confirmação
      toast({
        title: 'Sucesso!',
        description: 'Cadastro realizado. Verifique seu e-mail para confirmar.',
      })
      
      router.push(`/confirm?email=${encodeURIComponent(formData.email)}`)
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
        <h1 className="text-3xl font-bold text-gray-900">Criar Conta</h1>
        <p className="mt-2 text-sm text-gray-600">
          Comece a apostar nos vencedores do Oscar!
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="name">Nome completo</Label>
          <Input
            id="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Seu nome"
          />
        </div>

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

        <div>
          <Label htmlFor="confirmPassword">Confirmar senha</Label>
          <Input
            id="confirmPassword"
            type="password"
            required
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            placeholder="******"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? 'Criando conta...' : 'Criar conta'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Já tem uma conta?{' '}
          <Link href="/login" className="font-medium text-purple-600 hover:text-purple-500">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}