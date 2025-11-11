'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function ConfirmPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(false)

  const handleResend Email = async () => {
    if (!email) return

    setLoading(true)
    setCooldown(true)

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      })

      if (error) throw error

      toast.success("Sucesso!", { // ALTERADO
        description: 'E-mail reenviado! Verifique sua caixa de entrada novamente.',
      })
    } catch (error) {
      toast.error("Erro", { // ALTERADO
        description: 'Não foi possível reenviar o e-mail.',
      })
    } finally {
      setLoading(false)
      setTimeout(() => setCooldown(false), 30000) // 30 segundos cooldown
    }
  }

  return (
    <div className="text-center">
      <div className="mb-8">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="mt-4 text-2xl font-bold text-gray-900">
          Cadastro realizado com sucesso!
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Enviamos um e-mail de confirmação para{' '}
          <span className="font-medium text-gray-900">{email}</span>. Por favor,
          verifique sua caixa de entrada.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <Button
          onClick={handleResend}
          variant="outline"
          className="w-full"
          disabled={loading || cooldown}
        >
          {loading
            ? 'Reenviando...'
            : cooldown
            ? 'Aguarde 30 segundos'
            : 'Reenviar e-mail de confirmação'}
        </Button>

        <Button
          onClick={() => window.location.href = '/login'}
          className="w-full"
        >
          Continuar para login
        </Button>
      </div>
    </div>
  )
}