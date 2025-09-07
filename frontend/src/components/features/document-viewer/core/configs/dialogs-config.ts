import type { TypedMessage } from '@/components/shared/typed-confirmation-dialog'

export const CONVERT_TO_STAGED_DIALOG = {
  title: 'Convert to staged edition',
  description: 'This will convert the selection to a staged edition so you can edit it.',
  confirmButtonText: 'Convert',
  cancelButtonText: 'Cancel',
  variant: 'default' as const,
  messages: [
    {
      variant: 'warning' as const,
      title: 'Careful',
      description: 'You are about to edit a committed or staged-deletion selection.',
    },
    {
      variant: 'info' as const,
      title: 'What happens',
      description: 'The selection will be marked as staged edition and become editable.',
    },
  ] as TypedMessage[],
} as const;
