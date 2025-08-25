import type { ReactNode } from 'react'
import { TypedConfirmationDialog, type TypedMessage } from '@/components/shared/typed-confirmation-dialog'

export interface FormConfirmationDialogProps {
  isOpen: boolean,
  onClose: () => void,
  onConfirm: () => Promise<void>,
  title: string,
  description?: string | ReactNode,
  formFields: React.ReactNode[],
  confirmButtonText: string,
  cancelButtonText: string,
  variant?: 'destructive' | 'default',
  messages?: TypedMessage[],
}

export function FormConfirmationDialog(props: FormConfirmationDialogProps) {
  const { isOpen, onClose, onConfirm, title, description, formFields, confirmButtonText, cancelButtonText, variant, messages } = props
  return (
    <TypedConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      description={description}
      formFields={formFields}
      confirmationText={''}
      confirmButtonText={confirmButtonText}
      cancelButtonText={cancelButtonText}
      variant={variant}
      messages={messages}
      showConfirmationInput={false}
    />
  )
}

