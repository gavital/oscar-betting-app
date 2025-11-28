'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Opcional: garantir que existe sessão (após o link do e-mail)
    // Caso não haja sessão de recuperação, poderíamos redirecionar para /login
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Sessão de recuperação ausente', {
          description: 'Solicite um novo link de redefinição.',
        })
      }
    })()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      toast.error('Senha fraca', { description: 'Mínimo de 6 caracteres.' })
      return
    }
    if (password !== confirm) {
      toast.error('Senhas não coincidem')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      toast.success('Senha alterada!', {
        description: 'Agora você já pode acessar com a nova senha.',
      })

      // Opcional: enviar e-mail de confirmação da alteração (ver Passo 4)
      // await fetch('/api/notify/password-changed', { method: 'POST' })

      // Por segurança, finalize a sessão de recuperação e redirecione ao login
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (err: any) {
      toast.error('Erro ao redefinir senha', {
        description: err?.message ?? 'Tente novamente.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Redefinir senha</h1>
        <p className="mt-2 text-sm text-gray-600">
          Crie uma nova senha para sua conta.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="password">Nova senha</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="******"
          />
          {/* Opcional: indicador de força de senha aqui */}
        </div>

        <div>
          <Label htmlFor="confirm">Confirmar nova senha</Label>
          <Input
            id="confirm"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="******"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar nova senha'}
        </Button>
      </form>
    </div>
  )
}