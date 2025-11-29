'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useSupabase } from '@/providers/SupabaseProvider'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = useSupabase()

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
      toast.error("Erro", {
        description: 'As senhas não coincidem',
      })
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      toast.error("Erro", {
        description: 'A senha deve ter pelo menos 6 caracteres',
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
            role: 'user',
          },
          // Ajuste do path
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
        },
      })     

      if (error) {
        if (error.message.includes('already exists')) {
          toast.error("Erro", { // ALTERADO
            description: 'Este e-mail já está cadastrado',
          })
        } else {
          toast.error("Erro", { // ALTERADO
            description: error.message,
          })
        }
        return
      }

      toast.success("Sucesso!", { // ALTERADO
        description: 'Cadastro realizado. Verifique seu e-mail.',
      })

      router.push(`/confirm?email=${encodeURIComponent(formData.email)}`)
    } catch (error) {
      toast.error("Erro", { // ALTERADO
        description: 'Ocorreu um erro inesperado',
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