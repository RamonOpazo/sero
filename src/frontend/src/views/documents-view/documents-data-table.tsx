import { useMemo, useCallback, useState } from 'react';
import { Eye, Plus, CheckCircle2, AlertCircle, Copy, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/components/features/data-table';
import { columns, adaptColumns } from '@/components/features/data-table/columns';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/providers/workspace-provider';
import { useDocumentsView } from './use-documents-view';
import { UploadDocumentsDialog } from './dialogs/upload-documents-dialog';
import { EditDocumentDialog } from './dialogs/edit-document-dialog';
import { DeleteDocumentDialog } from './dialogs/delete-document-dialog';
import type { DocumentShallowType, DocumentType } from '@/types';
import type { ColumnConfig } from '@/components/features/data-table/columns';
import type { ColumnOption, CustomButtonOption } from '@/components/features/data-table/types';

interface DocumentsDataTableProps {
  onDocumentSelect?: (document: DocumentShallowType) => void;
}

export function DocumentsDataTable({ onDocumentSelect }: DocumentsDataTableProps) {
  const { state } = useWorkspace();
  
  // Pagination state
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  
  // Search state
  const [searchValue, setSearchValue] = useState('')
  
  // Column visibility state - exclude pinned columns from state management
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'description', 'tags', 'file_count', 'prompt_count', 
    'selection_count', 'status', 'created_at'
  ])
  
  // Selection state for checkboxes
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentShallowType[]>([])
  
  // Extract all business logic to custom hook
  const {
    projectId,
    documents,
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

  // Define columns using the new modern column system
  const documentColumns: ColumnConfig<DocumentShallowType>[] = useMemo(() => [
    // Document name - pinned, clickable, and custom renderer
    columns.custom<DocumentShallowType, string>(
      'name',
      'name',
      {
        header: 'Document Name',
        pinned: true,
        sortable: true,
        width: '200px',
        render: (_value, row) => nameRenderer(row)
      }
    ),
    
    // Description - truncated for readability
    columns.text<DocumentShallowType>('description', {
      header: 'Description',
      maxLength: 30,
      width: '250px',
      placeholder: 'No description'
    }),
    
    // Custom Tags column
    columns.custom<DocumentShallowType, string[]>(
      'tags',
      'tags',
      {
        header: 'Tags',
        width: '180px',
        render: (_value, row) => tagsRenderer(row)
      }
    ),
    
    // Prompt count - displayed as badge
    columns.number<DocumentShallowType>('prompt_count', {
      header: '# Prompts',
      width: '100px',
      align: 'left',
      sortable: true
    }),
    
    // Selection count - displayed as badge
    columns.number<DocumentShallowType>('selection_count', {
      header: '# Selections',
      width: '100px',
      align: 'left',
      sortable: true
    }),
    
    // Custom Status column
    columns.custom<DocumentShallowType, boolean>(
      'status',
      'is_processed',
      {
        header: 'Status',
        width: '120px',
        align: 'left',
        render: (_value, row) => processedStatusRenderer(row)
      }
    ),
    
    // Created date - relative formatting
    columns.date<DocumentShallowType>('created_at', {
      header: 'Created',
      width: '150px',
      sortable: true,
      format: { style: 'relative' }
    }),
 
    // Last updated - relative date formatting
    columns.date<DocumentShallowType>('updated_at', {
      header: 'Last Updated',
      width: '150px',
      sortable: true,
      format: { style: 'relative' }
    }),
    
    // Actions column - modern action definitions
    columns.actions<DocumentShallowType>('actions', {
      header: 'Actions',
      width: '5rem',
      align: 'center',
      actions: [
        {
          id: 'copy',
          label: 'Copy document ID',
          icon: Copy,
          onClick: (document) => {
            navigator.clipboard.writeText(document.id)
            toast.success('Document ID copied to clipboard', {
              description: `ID: ${document.id}`,
            })
          }
        },
        {
          id: 'select',
          label: 'Select Document',
          icon: Eye,
          onClick: (document) => {
            actionHandlers.onSelectDocument(document)
            toast.success('Document selected', {
              description: `Selected document: ${document.name}`,
            })
          }
        },
        {
          id: 'edit',
          label: 'Edit document',
          icon: Edit,
          onClick: actionHandlers.onEditDocument
        },
        {
          id: 'delete',
          label: 'Delete document',
          icon: Trash2,
          variant: 'destructive',
          onClick: actionHandlers.onDeleteDocument
        }
      ]
    })
  ], [processedStatusRenderer, tagsRenderer, nameRenderer, actionHandlers]);
  
  // Column options for visibility toggle - exclude pinned columns
  const tableColumns: ColumnOption[] = useMemo(() => [
    { key: 'description', header: 'Description' },
    { key: 'tags', header: 'Tags' },
    { key: 'file_count', header: 'Files' },
    { key: 'prompt_count', header: 'Prompts' },
    { key: 'selection_count', header: 'Selections' },
    { key: 'status', header: 'Status' },
    { key: 'created_at', header: 'Created' }
  ], []);
  
  // Custom buttons for the toolbar - delete button always visible
  const customButtons: CustomButtonOption[] = useMemo(() => [
    {
      label: 'Delete Selection',
      icon: Trash2,
      variant: 'destructive' as const,
      disabled: selectedDocuments.length === 0,
      onClick: () => {
        // Handle bulk delete - this would need to be implemented in the documents hook
        toast.success(`Deleting ${selectedDocuments.length} document${selectedDocuments.length === 1 ? '' : 's'}...`)
      }
    }
  ], [selectedDocuments]);
  
  // Filter documents based on search - always search all columns
  const filteredDocuments = useMemo(() => {
    if (!searchValue.trim()) return documents;
    
    return documents.filter(document => {
      const searchTerm = searchValue.toLowerCase();
      
      return (
        document.name.toLowerCase().includes(searchTerm) ||
        (document.description?.toLowerCase().includes(searchTerm)) ||
        document.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    });
  }, [documents, searchValue]);
  
  // Filter columns based on visibility - always include pinned and actions columns
  const visibleDocumentColumns = useMemo(() => {
    return documentColumns.filter(col => {
      // Always include actions column and pinned columns (name)
      if (col.id === 'actions' || col.id === 'name') {
        return true;
      }
      // Include other columns based on visibility state
      return visibleColumns.includes(col.id);
    });
  }, [documentColumns, visibleColumns]);
  
  // Convert new column configs to legacy format for DataTable compatibility
  const legacyColumns = useMemo(() => adaptColumns(visibleDocumentColumns), [visibleDocumentColumns]);

  // Handle column visibility changes
  const handleColumnVisibilityChange = useCallback((columnKey: string, visible: boolean) => {
    setVisibleColumns(prev => 
      visible
        ? [...prev, columnKey]
        : prev.filter(key => key !== columnKey)
    );
  }, []);
  
  // Paginate filtered data
  const startIndex = pageIndex * pageSize
  const endIndex = startIndex + pageSize
  const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex)

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
        columns={legacyColumns}
        data={paginatedDocuments}
        selectedRows={selectedDocuments}
        onRowSelect={setSelectedDocuments}
        searchPlaceholder="Search documents..."
        searchValue={searchValue}
        onSearch={setSearchValue}
        onAddNew={actionHandlers.onCreateDocument}
        addNewLabel="Upload Document"
        showCheckboxes={true}
        showActions={true}
        // Column visibility features
        tableColumns={tableColumns}
        visibleColumns={visibleColumns}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        // Custom buttons
        customButtons={customButtons}
        pagination={{
          pageIndex,
          pageSize,
          totalItems: filteredDocuments.length,
          onPageChange: setPageIndex,
          onPageSizeChange: setPageSize,
          showPagination: true,
          pageSizeOptions: [5, 10, 20, 50]
        }}
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
