import { TypedConfirmationDialog, type TypedMessage } from '@/components/shared/typed-confirmation-dialog'
import { Save } from 'lucide-react'

interface SavePromptChangesConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  changesCount: number;
  isSaving: boolean;
}

export default function SavePromptChangesConfirmationDialog({ isOpen, onClose, onConfirm, changesCount }: SavePromptChangesConfirmationDialogProps) {
  const messages: TypedMessage[] = [
    {
      variant: 'info',
      title: 'Summary',
      description: `You are about to save ${changesCount} change${changesCount === 1 ? '' : 's'} to the server.`,
    },
    {
      variant: 'info',
      description: 'All new prompts will be created; modified prompts updated; deleted prompts removed. This cannot be undone.',
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
