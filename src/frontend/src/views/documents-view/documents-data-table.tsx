import { useMemo, useCallback } from 'react';
import { Eye, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { DataTable, ColumnBuilder as Column, Actions } from '@/components/features/data-table';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/providers/workspace-provider';
import { useDocumentsView } from './use-documents-view';
import { UploadDocumentsDialog } from './dialogs/upload-documents-dialog';
import { EditDocumentDialog } from './dialogs/edit-document-dialog';
import { DeleteDocumentDialog } from './dialogs/delete-document-dialog';
import type { DocumentShallowType, DocumentType } from '@/types';

interface DocumentsDataTableProps {
  onDocumentSelect?: (document: DocumentShallowType) => void;
}

export function DocumentsDataTable({ onDocumentSelect }: DocumentsDataTableProps) {
  const { state } = useWorkspace();
  
  // Extract all business logic to custom hook
  const {
    projectId,
    documents,
    currentDocument,
    isLoading,
    error,
    dialogState,
    actionHandlers,
  } = useDocumentsView(onDocumentSelect);


  const processedStatusRenderer = useCallback((document: DocumentShallowType) => {
    if (document.is_processed) {
      return (
        <Badge variant="default" className="flex items-center space-x-1">
          <CheckCircle2 className="h-3 w-3" />
          <span>Processed</span>
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="flex items-center space-x-1">
          <AlertCircle className="h-3 w-3" />
          <span>Pending</span>
        </Badge>
      );
    }
  }, []);

  const tagsRenderer = useCallback((document: DocumentShallowType) => {
    if (document.tags.length === 0) {
      return <span className="text-muted-foreground text-sm">No tags</span>;
    }
    
    const displayTags = document.tags.slice(0, 3);
    const remainingCount = document.tags.length - displayTags.length;
    
    return (
      <div className="flex flex-wrap gap-1">
        {displayTags.map((tag, index) => (
          <Badge key={index} variant="outline" className="text-xs">
            {tag}
          </Badge>
        ))}
        {remainingCount > 0 && (
          <Badge variant="outline" className="text-xs">
            +{remainingCount}
          </Badge>
        )}
      </div>
    );
  }, []);

  // Pure UI rendering functions
  const nameRenderer = useCallback((document: DocumentShallowType) => {
    return (
      <button
        onClick={() => actionHandlers.onSelectDocument(document)}
        className="text-left font-medium text-primary hover:text-primary/80 hover:underline focus:outline-none focus:underline transition-colors"
        title={`Select document: ${document.name}`}
      >
        {document.name.length > 25 ? `${document.name.slice(0, 25)}...` : document.name}
      </button>
    );
  }, [actionHandlers.onSelectDocument]);

  const columns = useMemo(() => [
    // Custom clickable name column
    {
      id: 'name',
      key: 'name',
      header: 'Name',
      accessorKey: 'name',
      cell: (_: any, row: DocumentShallowType) => nameRenderer(row),
      enableSorting: true,
      pinFirstColumn: true,
    },
    
    Column.text<DocumentShallowType>('description')
      .header('Description')
      .truncate(30)
      .build(),
    
    // Custom Tags column
    {
      id: 'tags',
      key: 'tags',
      header: 'Tags',
      cell: (_: any, row: DocumentShallowType) => tagsRenderer(row),
    },
    
    Column.badge<DocumentShallowType>('file_count')
      .header('Files')
      .sortable()
      .build(),
    
    Column.badge<DocumentShallowType>('prompt_count')
      .header('Prompts')
      .sortable()
      .build(),
    
    Column.badge<DocumentShallowType>('selection_count')
      .header('Selections')
      .sortable()
      .build(),
    
    // Custom Status column
    {
      id: 'status',
      key: 'status',
      header: 'Status',
      cell: (_: any, row: DocumentShallowType) => processedStatusRenderer(row),
    },
    
    Column.date<DocumentShallowType>('created_at')
      .header('Created')
      .sortable()
      .build(),
  ], [processedStatusRenderer, tagsRenderer, nameRenderer]);

  const tableActions = useMemo(() => Actions.create<DocumentShallowType>()
    .copy(
      (document) => document.id,
      'Copy document ID'
    )
    .separator()
    .custom(
      'Select Document',
      'select',
      actionHandlers.onSelectDocument,
      {
        icon: Eye,
        variant: 'default'
      }
    )
    .edit(actionHandlers.onEditDocument, 'Edit document')
    .delete(actionHandlers.onDeleteDocument, 'Delete document')
    .build(), [actionHandlers]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load documents</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        message={`No documents found${state.currentProject ? ` in "${state.currentProject.name}"` : ''}`}
        buttonText="Upload your first document"
        buttonIcon={<Plus className="h-4 w-4" />}
        onButtonClick={actionHandlers.onCreateDocument}
      />
    );
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={documents}
        selectedRows={currentDocument ? [currentDocument] : []}
        onRowSelect={() => {}}
        searchPlaceholder="Search documents..."
        onAddNew={actionHandlers.onCreateDocument}
        actions={tableActions}
        showCheckboxes={false}
        showActions={true}
      />
      
      {/* Document Upload Dialog */}
      <UploadDocumentsDialog
        projectId={projectId!}
        isOpen={dialogState.upload.isOpen}
        onClose={dialogState.upload.onClose}
        onSubmit={dialogState.upload.onSubmit}
      />
      
      {/* Document Edit Dialog */}
      {dialogState.edit.document && (
        <EditDocumentDialog
          document={{
            ...dialogState.edit.document,
            files: [],
            prompts: [],
            selections: [],
            original_file: null,
            redacted_file: null,
          } as DocumentType}
          isOpen={dialogState.edit.isOpen}
          onClose={dialogState.edit.onClose}
          onSubmit={dialogState.edit.onSubmit}
        />
      )}
      
      {/* Document Deletion Dialog */}
      <DeleteDocumentDialog
        isOpen={dialogState.delete.isOpen}
        onClose={dialogState.delete.onClose}
        onConfirm={dialogState.delete.onConfirm}
        selectedDocument={dialogState.delete.selectedDocument}
      />
    </>
  );
}
