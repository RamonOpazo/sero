import { TypedConfirmationDialog, type TypedMessage } from '@/components/shared/typed-confirmation-dialog'
import { Save } from 'lucide-react'

interface SaveConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  changesCount: number;
  isSaving: boolean;
}

export default function SaveConfirmationDialog({ isOpen, onClose, onConfirm, changesCount }: SaveConfirmationDialogProps) {
  const messages: TypedMessage[] = [
    {
      variant: 'info',
      title: 'Summary',
      description: `You are about to save ${changesCount} change${changesCount === 1 ? '' : 's'} to the server.`,
    },
    {
      variant: 'info',
      description: 'All new selections will be created; modified selections updated; deleted selections removed. This cannot be undone.',
    },
  ]

  return (
    <TypedConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={(
        <span className="flex items-center gap-2">
          <Save className="h-5 w-5" />
          Save All Changes
        </span>
      ) as unknown as string}
      description={undefined}
      confirmationText="proceed"
      confirmButtonText="Save Changes"
      cancelButtonText="Cancel"
      variant="default"
      messages={messages}
      showConfirmationInput={true}
    />
  )
}
