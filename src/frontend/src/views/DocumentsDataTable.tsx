import { useMemo, useCallback } from 'react';
import { Eye, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, Column, Actions } from '@/components/features/data-table';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { useProject } from '@/context/ProjectProvider';
import type { DocumentShallowType } from '@/types';

interface DocumentsDataTableProps {
  onDocumentSelect?: (document: DocumentShallowType) => void;
}

export function DocumentsDataTable({ onDocumentSelect }: DocumentsDataTableProps) {
  const { state } = useProject();
  

  const handleSelectDocument = useCallback((document: DocumentShallowType) => {
    if (onDocumentSelect) {
      onDocumentSelect(document);
    }
  }, [onDocumentSelect]);

  const handleCreateDocument = useCallback(() => {
    // TODO: Implement document creation
    toast.info('Document creation not yet implemented');
  }, []);

  const handleEditDocument = useCallback((document: DocumentShallowType) => {
    // TODO: Implement document editing
    toast.info(`Edit document: ${document.name} - Not yet implemented`);
  }, []);

  const handleDeleteDocument = useCallback((document: DocumentShallowType) => {
    // TODO: Implement document deletion
    toast.info(`Delete document: ${document.name} - Not yet implemented`);
  }, []);

  const handleCopyDocumentId = useCallback((document: DocumentShallowType) => {
    navigator.clipboard.writeText(document.id);
    toast.success('Document ID copied to clipboard', {
      description: `ID: ${document.id}`,
    });
  }, []);


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

  const nameRenderer = useCallback((document: DocumentShallowType) => {
    return (
      <button
        onClick={() => handleSelectDocument(document)}
        className="text-left font-medium text-primary hover:text-primary/80 hover:underline focus:outline-none focus:underline transition-colors"
        title={`Select document: ${document.name}`}
      >
        {document.name.length > 25 ? `${document.name.slice(0, 25)}...` : document.name}
      </button>
    );
  }, [handleSelectDocument]);

  const columns = useMemo(() => [
    // Custom clickable name column
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'name',
      cell: ({ row }) => nameRenderer(row.original),
      enableSorting: true,
    },
    
    Column.text<DocumentShallowType>('description')
      .header('Description')
      .truncate(30)
      .build(),
    
    // Custom Tags column
    {
      id: 'tags',
      header: 'Tags',
      cell: ({ row }) => tagsRenderer(row.original),
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
      header: 'Status',
      cell: ({ row }) => processedStatusRenderer(row.original),
    },
    
    Column.date<DocumentShallowType>('created_at')
      .header('Created')
      .sortable()
      .build(),

    Actions.create<DocumentShallowType>()
      .copy(
        (document) => document.id,
        'Copy document ID',
        handleCopyDocumentId
      )
      .separator()
      .custom({
        label: 'Select Document',
        icon: Eye,
        onClick: handleSelectDocument,
        variant: 'default'
      })
      .edit(handleEditDocument, 'Edit document')
      .delete(handleDeleteDocument, 'Delete document')
      .build()
  ], [handleSelectDocument, handleEditDocument, handleDeleteDocument, handleCopyDocumentId, processedStatusRenderer, tagsRenderer, nameRenderer]);

  if (state.isLoadingDocuments) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (state.documentsError) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load documents</p>
          <p className="text-sm text-muted-foreground">{state.documentsError}</p>
        </div>
      </div>
    );
  }

  if (state.documents.length === 0) {
    return (
      <EmptyState
        message={`No documents found${state.currentProject ? ` in "${state.currentProject.name}"` : ''}`}
        buttonText="Create your first document"
        buttonIcon={<Plus className="h-4 w-4" />}
        onButtonClick={handleCreateDocument}
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={state.documents}
      selection={state.currentDocument ? [state.currentDocument] : []}
      searchKey="name"
      searchPlaceholder="Search documents..."
      onCreateEntries={handleCreateDocument}
      enableRowSelection={false} // We handle selection through actions
      enableDeleteSelection={false} // We handle deletion through actions
      pageSize={10}
    />
  );
}
