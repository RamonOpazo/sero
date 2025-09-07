import { useMemo, useCallback, useState } from 'react';
import { FileInput, Plus, Copy, Edit, Trash2, ArrowLeft, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/components/features/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/providers/workspace-provider';
import type { DocumentShallowType } from '@/types';
import type { ColumnOption, CustomButtonOption } from '@/components/features/data-table/types';

interface DocumentsDataTableProps {
  documents: DocumentShallowType[]
  isLoading: boolean
  error: string | null
  actionHandlers: {
    onSelectDocument: (d: DocumentShallowType) => void
    onCreateDocument: () => void
    onEditDocument: (d: DocumentShallowType) => void
    onDeleteDocument: (d: DocumentShallowType) => void
    onScopeToProject: (d: DocumentShallowType) => void
    onBackToProjects: () => void
  }
}

export function DocumentsDataTable({ documents, isLoading, error, actionHandlers }: DocumentsDataTableProps) {
  const { state } = useWorkspace();

  // Pagination state
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  // Search state
  const [searchValue, setSearchValue] = useState('')

  // Column visibility state - exclude pinned columns from state management
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'description', 'scope', 'file_count', 'prompt_count',
    'selection_count', 'status', 'created_at',
  ])

  // Selection state for checkboxes
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentShallowType[]>([])

  // Dialogs lifted to DocumentsView; this component is table-focused

  const processedStatusRenderer = useCallback((document: DocumentShallowType) => {
    if (document.is_processed) {
      return (
        <Badge variant="outline" status="success">Processed</Badge>
      );
    } else {
      return (
        <Badge variant="outline" status="muted">Pending</Badge>
      );
    }
  }, []);

  const scopeRenderer = useCallback((document: DocumentShallowType) => {
    return document.is_template ? (
      <Badge variant="outline" status="warning">Project</Badge>
    ) : (
      <Badge variant="outline" status="muted">Document</Badge>
    );
  }, []);

  // Pure UI rendering functions
  const nameRenderer = useCallback((document: DocumentShallowType) => {
    return (
      <Button
        variant="link"
        onClick={() => actionHandlers.onSelectDocument(document)}
        title={`Select document: ${document.name}`}
        className="p-0"
      >
        {document.name.length > 25 ? `${document.name.slice(0, 25)}...` : document.name}
      </Button>
    );
  }, [actionHandlers.onSelectDocument]);

// Define columns using the simple declarative system
  const documentColumnDefs = useMemo(() => [
    // Document name - pinned, clickable, custom renderer (with optional select checkbox)
    {
      id: 'name',
      type: 'select',
      header: 'Document Name',
      accessor: 'name',
      pinned: true,
      sortable: true,
      width: '200px',
      render: (_value: string, row: DocumentShallowType) => nameRenderer(row),
    },

    // Description - truncated
    {
      id: 'description',
      type: 'text',
      header: 'Description',
      accessor: 'description',
      maxLength: 30,
      width: '250px',
      placeholder: 'No description',
    },

    // Scope - custom badge from is_template
    {
      id: 'scope',
      type: 'custom',
      header: 'Scope',
      accessor: 'is_template',
      width: '120px',
      align: 'left',
      render: (_value: boolean, row: DocumentShallowType) => scopeRenderer(row),
    },

    // Prompt count
    {
      id: 'prompt_count',
      type: 'number',
      header: '# Prompts',
      accessor: 'prompt_count',
      width: '100px',
      align: 'left',
      sortable: true,
    },

    // Selection count
    {
      id: 'selection_count',
      type: 'number',
      header: '# Selections',
      accessor: 'selection_count',
      width: '100px',
      align: 'left',
      sortable: true,
    },

    // Status - custom badge from is_processed
    {
      id: 'status',
      type: 'custom',
      header: 'Status',
      accessor: 'is_processed',
      width: '120px',
      align: 'left',
      render: (_value: boolean, row: DocumentShallowType) => processedStatusRenderer(row),
    },

    // Created/Updated dates
    {
      id: 'created_at',
      type: 'date',
      header: 'Created',
      accessor: 'created_at',
      width: '150px',
      sortable: true,
      format: { style: 'relative' },
    },
    {
      id: 'updated_at',
      type: 'date',
      header: 'Last Updated',
      accessor: 'updated_at',
      width: '150px',
      sortable: true,
      format: { style: 'relative' },
    },

    // Actions column
    {
      id: 'actions',
      type: 'actions',
      header: 'Actions',
      width: '5rem',
      align: 'right',
      actions: [
        {
          id: 'copy',
          label: 'Copy document ID',
          icon: Copy,
          onClick: (document: DocumentShallowType) => {
            navigator.clipboard.writeText(document.id)
            toast.success('Document ID copied to clipboard', {
              description: `ID: ${document.id}`,
            })
          },
        },
        {
          id: 'select',
          label: 'Select Document',
          icon: FileInput,
          onClick: (document: DocumentShallowType) => {
            actionHandlers.onSelectDocument(document)
            toast.success('Document selected', {
              description: `Selected document: ${document.name}`,
            })
          },
        },
        {
          id: 'scope-to-project',
          label: 'Scope to Project',
          icon: Flag,
          onClick: actionHandlers.onScopeToProject,
          disabled: (row: DocumentShallowType) => row.is_template === true,
        },
        {
          id: 'edit',
          label: 'Edit document',
          icon: Edit,
          onClick: actionHandlers.onEditDocument,
        },
        {
          id: 'delete',
          label: 'Delete document',
          icon: Trash2,
          variant: 'destructive',
          onClick: actionHandlers.onDeleteDocument,
        },
      ],
    },
  ], [processedStatusRenderer, nameRenderer, actionHandlers]);

// Column options for visibility toggle - derive from defs (exclude pinned/actions)
  const tableColumns: ColumnOption[] = useMemo(() => {
    return documentColumnDefs
      .filter(col => col.id !== 'name' && col.id !== 'actions')
      .map(col => ({ key: col.id, header: String(col.header ?? col.id) }))
  }, [documentColumnDefs]);

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
        (document.description?.toLowerCase().includes(searchTerm))
      );
    });
  }, [documents, searchValue]);

// Filter columns based on visibility - always include pinned and actions columns
  const visibleDocumentColumnDefs = useMemo(() => {
    return documentColumnDefs.filter(col => {
      if (col.id === 'actions' || col.id === 'name') {
        return true
      }
      return visibleColumns.includes(col.id)
    })
  }, [documentColumnDefs, visibleColumns]);

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

  const content = (() => {
    if (error) {
      return (
        <EmptyState
          message="Failed to load documents"
          buttonText="Back to Projects"
          buttonIcon={<ArrowLeft />}
          onButtonClick={actionHandlers.onBackToProjects}
        />
      );
    }

    if (isLoading) {
      return (
        <EmptyState
          variant="await"
          message="Loading documents..."
        />
      );
    }

    if (documents.length > 0) {
      return (
        <DataTable
          columnDefs={visibleDocumentColumnDefs as any}
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
      )
    }

    // Fallback: documents loading did not error but no data was fetched (empty project)
    return (
      <EmptyState
        message={`No documents found${state.currentProject ? ` in \"${state.currentProject.name}\"` : ''}`}
        buttonText="Upload your first documents"
        buttonIcon={<Plus />}
        onButtonClick={actionHandlers.onCreateDocument}
      />
    );
  })();

  return (
    <>
      {content}
    </>
  );
}
