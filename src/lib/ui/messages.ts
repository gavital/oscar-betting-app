import { toast } from 'sonner'
import type { ActionError } from '@/app/(dashboard)/admin/categories/actions'

export function getErrorMessage(error: ActionError): string {
  switch (error.code) {
    case 'VALIDATION_ID_REQUIRED':
      return 'ID obrigatório para executar a ação.'
    case 'VALIDATION_NAME_MIN_LENGTH':
      return 'O nome da categoria deve ter pelo menos 3 caracteres.'
    case 'VALIDATION_MAX_RANGE':
      return 'Número de indicados deve estar entre 1 e 20.'
    case 'AUTH_NOT_AUTHENTICATED':
      return 'Você precisa estar autenticado para realizar esta ação.'
    case 'AUTH_FORBIDDEN':
      return 'Você não tem permissão para realizar esta ação.'
    case 'CATEGORY_NAME_DUPLICATE':
      return 'Já existe uma categoria com este nome.'
    case 'DB_SELECT_ERROR':
    case 'DB_INSERT_ERROR':
    case 'DB_UPDATE_ERROR':
      return 'Ocorreu um erro ao acessar o banco de dados. Tente novamente.'
    default:
      return error.message || 'Ocorreu um erro inesperado.'
  }
}

export function showErrorToast(error: ActionError) {
  toast.error('Erro', { description: getErrorMessage(error) })
}

export function showSuccessToast(message = 'Operação realizada com sucesso') {
  toast.success('Sucesso', { description: message })
}