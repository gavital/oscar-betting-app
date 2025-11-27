'use client'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { toast } from 'sonner'
import { useEffect } from 'react'
import { createCategory } from '@/app/(dashboard)/admin/categories/actions'
import { useRouter } from 'next/navigation'

// Componente de loading
function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <div className="mr-2 h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
          Salvando...
        </>
      ) : (
        <>
          <Save className="mr-2 h-4 w-4" />
          Salvar Categoria
        </>
      )}
    </Button>
  )
}

export default function NewCategoryPage() {
  const [state, formAction] = useActionState(createCategory, null)
  const router = useRouter()

  useEffect(() => {
    if (state?.error) {
      toast.error('Erro', { description: state.error })
    }
    if (state?.success && state?.id) {
      toast.success('Sucesso', { description: 'Categoria criada!' })
      // Redireciona com highlight
      router.replace(`/admin/categories?highlight=${state.id}`)
    }
  }, [state, router])

  return (
    <div className="space-y-6">
      <Link href="/admin/categories" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para Categorias
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Nova Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-6">
            <div>
              <Label htmlFor="name">Nome da Categoria</Label>
              <Input id="name" name="name" required placeholder="Ex: Melhor Filme" minLength={3} />
            </div>
            <div>
              <Label htmlFor="max_nominees">Número Máximo de Indicados</Label>
              <Input id="max_nominees" name="max_nominees" type="number" required min={1} max={20} defaultValue={5} />
            </div>
            <div className="flex gap-4">
              <Link href="/admin/categories">
                <Button type="button" variant="outline">Cancelar</Button>
              </Link>
              <SubmitButton />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
