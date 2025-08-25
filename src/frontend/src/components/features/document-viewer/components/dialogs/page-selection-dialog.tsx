import { FormConfirmationDialog } from '@/components/shared'
import type { TypedMessage } from '@/components/shared/typed-confirmation-dialog'

interface PageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (pageNumber: number | null) => void; // null means make it global
  currentPage: number;
  totalPages: number;
  selectionId?: string | null;
}

export default function PageSelectionDialog({ isOpen, onClose, onConfirm, currentPage, totalPages }: PageSelectionDialogProps) {
  const messages: TypedMessage[] = [
    {
      variant: 'info',
      title: 'Usage',
      description: `Currently viewing page ${currentPage + 1} of ${totalPages}. Toggle global to show on all pages, or pick a page number.`,
    },
  ]

  return (
    <FormConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Choose Target Page"
      description="Configure how this selection should be displayed across the document."
      confirmButtonText="Apply"
      cancelButtonText="Cancel"
      variant="default"
      messages={messages}
      initialValues={{ isGlobal: false, page: currentPage + 1 }}
      fields={[
        { type: 'switch', name: 'isGlobal', label: 'Global Selection', tooltip: 'Appear on all pages' },
        { type: 'number', name: 'page', label: 'Target Page Number', placeholder: `Enter page number (1-${totalPages})`, required: true, tooltip: `Range: 1 to ${totalPages}`, min: 1, max: totalPages, step: 1 },
      ]}
      onSubmit={async (values) => {
        const isGlobal = !!values.isGlobal;
        if (isGlobal) {
          onConfirm(null);
          return;
        }
        const pageNum = Number(values.page);
        if (!Number.isFinite(pageNum) || pageNum < 1 || pageNum > totalPages) {
          throw new Error('Invalid page number');
        }
        onConfirm(pageNum - 1);
      }}
    />
  )
}
