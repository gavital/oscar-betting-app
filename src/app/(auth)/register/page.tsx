'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { toast } from 'sonner'
import { useSupabase } from '@/providers/SupabaseProvider'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const schema = z.object({
  name: z.string().min(2, 'Informe seu nome completo'),
  email: z.string().email('Informe um e-mail válido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((vals) => vals.password === vals.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const supabase = useSupabase()

  const form = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
    mode: 'onChange',
  })

  const onSubmit = async (values: RegisterForm) => {
    try {
      // Cria usuário com email e senha
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { name: values.name, role: 'user' },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
        },
      })     

      if (error) {
        if (error.message.includes('already exists')) {
          toast.error('Erro', { description: 'Este e-mail já está cadastrado' })
        } else {
          toast.error('Erro', { description: error.message })
        }
        return
      }

      toast.success('Sucesso!', { description: 'Cadastro realizado. Verifique seu e-mail.' })
      router.push(`/confirm?email=${encodeURIComponent(values.email)}`)
    } catch {
      toast.error('Erro', { description: 'Ocorreu um erro inesperado' })
    }
  }

  const isSubmitting = form.formState.isSubmitting
  const isValid = form.formState.isValid

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground">Criar Conta</h1>
        <p className="mt-2 text-sm text-muted-foreground">Comece a apostar nos vencedores do Oscar!</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome completo</FormLabel>
                <FormControl>
                  <Input id="name" type="text" placeholder="Seu nome" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input id="email" type="email" placeholder="seu@email.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha</FormLabel>
                <FormControl>
                  <Input id="password" type="password" placeholder="******" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar senha</FormLabel>
                <FormControl>
                  <Input id="confirmPassword" type="password" placeholder="******" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={!isValid || isSubmitting}>
            {isSubmitting ? 'Criando conta...' : 'Criar conta'}
        </Button>
      </form>
      </Form>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Já tem uma conta?{' '}
          <Link href="/login" className="font-medium text-purple-600 hover:text-purple-500">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}