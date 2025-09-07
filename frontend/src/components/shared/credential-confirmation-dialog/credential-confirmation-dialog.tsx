import { FormConfirmationDialog } from '@/components/shared/form-confirmation-dialog';

export interface CredentialConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void> | void;
  isLoading?: boolean;
  error?: string | null;
  providerName?: string | null;
}

export function CredentialConfirmationDialog({ isOpen, onClose, onConfirm, isLoading = false, error = null, providerName = null }: CredentialConfirmationDialogProps) {
  return (
    <FormConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Enter provider password"
      description={providerName ? (<span>Provider: <span className="font-medium">{providerName}</span></span>) : undefined}
      confirmButtonText={isLoading ? 'Encrypting…' : 'Confirm'}
      cancelButtonText="Cancel"
      fields={[{ type: 'password', name: 'password', label: 'Password', placeholder: 'Enter provider password', required: true }]}
      initialValues={{ password: '' }}
      onSubmit={async (values) => { await onConfirm(String(values.password ?? '')); }}
      variant="default"
      messages={error ? [{ variant: 'error', title: 'Error', description: error }] : []}
    />
  );
}
