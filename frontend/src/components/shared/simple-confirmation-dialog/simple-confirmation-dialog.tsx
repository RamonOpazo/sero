import type { ReactNode } from 'react'
import { TypedConfirmationDialog, type TypedMessage } from '@/components/shared/typed-confirmation-dialog'

export interface SimpleConfirmationDialogProps {
  isOpen: boolean,
  onClose: () => void,
  onConfirm: () => Promise<void>,
  title: string,
  description?: string | ReactNode,
  confirmButtonText?: string,
  cancelButtonText?: string,
  variant?: 'destructive' | 'default',
  messages?: TypedMessage[],
}

export function SimpleConfirmationDialog(props: SimpleConfirmationDialogProps) {
  const { isOpen, onClose, onConfirm, title, description, confirmButtonText, cancelButtonText, variant, messages } = props
  return (
    <TypedConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      description={description}
      confirmationText={''}
      confirmButtonText={confirmButtonText}
      cancelButtonText={cancelButtonText}
      variant={variant}
      messages={messages}
      showConfirmationInput={false}
    />
  )
}

