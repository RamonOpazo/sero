import { useMemo, useCallback, useState } from 'react';
import { Eye, Plus, Copy, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/components/features/data-table';
import { columns, adaptColumns } from '@/components/features/data-table/columns';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { CreateProjectDialog, EditProjectDialog } from './dialogs';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { useProjectsView } from './use-projects-view';
import type { ProjectShallowType } from '@/types';
import type { ColumnConfig } from '@/components/features/data-table/columns';
import type { ColumnOption, CustomButtonOption } from '@/components/features/data-table/types';

interface ProjectsDataTableProps {
  onProjectSelect?: (project: ProjectShallowType) => void;
}

export function ProjectsDataTable({ onProjectSelect }: ProjectsDataTableProps) {
  // Pagination state
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  
  // Search state
  const [searchValue, setSearchValue] = useState('')
  
  // Column visibility state - exclude pinned columns from state management
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'description', 'document_count', 'updated_at', 
    'contact_name', 'version', 'contact_email', 'created_at'
  ])

  // Extract all business logic to custom hook
  const {
    projects,
    selectedProjects,
    isLoading,
    error,
    dialogState,
    actionHandlers,
  } = useProjectsView(onProjectSelect);

  // Pure UI rendering functions
  const nameRenderer = useCallback((project: ProjectShallowType) => {
    return (
      <button
        onClick={() => actionHandlers.onSelectProject(project)}
        className="text-left font-medium text-primary hover:text-primary/80 hover:underline focus:outline-none focus:underline transition-colors"
        title={`Select project: ${project.name}`}
      >
        {project.name.length > 30 ? `${project.name.slice(0, 30)}...` : project.name}
      </button>
    );
  }, [actionHandlers.onSelectProject]);

  // Define columns using the new modern column system
  const projectColumns: ColumnConfig<ProjectShallowType>[] = useMemo(() => [
    // Project name - pinned, clickable, and custom renderer
    columns.custom<ProjectShallowType, string>(
      'name',
      'name',
      {
        header: 'Project Name',
        pinned: true,
        sortable: true,
        width: '150px',
        render: (_value, row) => nameRenderer(row)
      }
    ),
    
    // Description - truncated for readability
    columns.text<ProjectShallowType>('description', {
      header: 'Description',
      maxLength: 40,
      width: '200px',
      placeholder: 'No description'
    }),
    
    // Document count - displayed as badge
    columns.badge<ProjectShallowType>('document_count', {
      header: 'Documents',
      width: '120px',
      align: 'center',
      sortable: true
    }),
    
    // Last updated - relative date formatting
    columns.date<ProjectShallowType>('updated_at', {
      header: 'Last Updated',
      width: '150px',
      sortable: true,
      format: { style: 'relative' }
    }),
    
    // Contact person - truncated
    columns.text<ProjectShallowType>('contact_name', {
      header: 'Contact Person',
      maxLength: 20,
      width: '150px'
    }),
    
    // Version - custom badge renderer
    columns.custom<ProjectShallowType, number>(
      'version',
      'version',
      {
        header: 'Version',
        width: '100px',
        align: 'center',
        sortable: true,
        render: (value) => <Badge variant="outline">v{value}</Badge>
      }
    ),
    
    // Contact email - truncated with monospace font
    columns.text<ProjectShallowType>('contact_email', {
      header: 'Email Address',
      maxLength: 25,
      width: '180px',
      className: 'font-mono text-sm'
    }),
    
    // Created date - relative formatting
    columns.date<ProjectShallowType>('created_at', {
      header: 'Created',
      width: '150px',
      sortable: true,
      format: { style: 'relative' }
    }),
    
    // Actions column - modern action definitions
    columns.actions<ProjectShallowType>('actions', {
      header: 'Actions',
      width: '5rem',
      align: 'center',
      actions: [
        {
          id: 'copy',
          label: 'Copy ID',
          icon: Copy,
          onClick: (project) => {
            navigator.clipboard.writeText(project.id)
            toast.success('Project ID copied to clipboard', {
              description: `ID: ${project.id}`,
            })
          }
        },
        {
          id: 'select',
          label: 'Select project',
          icon: Eye,
          onClick: (project) => {
            actionHandlers.onSelectProject(project)
            toast.success('Project selected', {
              description: `Switched to project: ${project.name}`,
            })
          }
        },
        {
          id: 'edit',
          label: 'Edit project',
          icon: Edit,
          onClick: actionHandlers.onEditProject
        },
        {
          id: 'delete',
          label: 'Delete project',
          icon: Trash2,
          variant: 'destructive',
          onClick: actionHandlers.onDeleteProject
        }
      ]
    })
  ], [nameRenderer, actionHandlers]);
  
  
  // Column options for visibility toggle - exclude pinned columns
  const tableColumns: ColumnOption[] = useMemo(() => [
    { key: 'description', header: 'Description' },
    { key: 'document_count', header: 'Documents' },
    { key: 'updated_at', header: 'Last Updated' },
    { key: 'contact_name', header: 'Contact Person' },
    { key: 'version', header: 'Version' },
    { key: 'contact_email', header: 'Email Address' },
    { key: 'created_at', header: 'Created' }
  ], []);
  
  // Custom buttons for the toolbar - delete button always visible
  const customButtons: CustomButtonOption[] = useMemo(() => [
    {
      label: 'Delete Selection',
      icon: Trash2,
      variant: 'destructive' as const,
      disabled: selectedProjects.length === 0,
      onClick: () => actionHandlers.onBulkDelete()
    }
  ], [selectedProjects, actionHandlers]);
  
  // Filter projects based on search - always search all columns
  const filteredProjects = useMemo(() => {
    if (!searchValue.trim()) return projects;
    
    return projects.filter(project => {
      const searchTerm = searchValue.toLowerCase();
      
      return (
        project.name.toLowerCase().includes(searchTerm) ||
        (project.description?.toLowerCase().includes(searchTerm)) ||
        (project.contact_name?.toLowerCase().includes(searchTerm)) ||
        (project.contact_email?.toLowerCase().includes(searchTerm))
      );
    });
  }, [projects, searchValue]);
  
  // Filter columns based on visibility - always include pinned and actions columns
  const visibleProjectColumns = useMemo(() => {
    return projectColumns.filter(col => {
      // Always include actions column and pinned columns (name)
      if (col.id === 'actions' || col.id === 'name') {
        return true;
      }
      // Include other columns based on visibility state
      return visibleColumns.includes(col.id);
    });
  }, [projectColumns, visibleColumns]);
  
  // Convert new column configs to legacy format for DataTable compatibility
  const legacyColumns = useMemo(() => adaptColumns(visibleProjectColumns), [visibleProjectColumns]);

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
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load projects</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        message="No projects found"
        buttonText="Create your first project"
        buttonIcon={<Plus className="h-4 w-4" />}
        onButtonClick={actionHandlers.onCreateProject}
      />
    );
  }

  return (
    <>
      <DataTable
        columns={legacyColumns}
        data={paginatedProjects}
        selectedRows={selectedProjects}
        onRowSelect={actionHandlers.onRowSelectionChange}
        searchPlaceholder="Search projects..."
        searchValue={searchValue}
        onSearch={setSearchValue}
        onAddNew={actionHandlers.onCreateProject}
        addNewLabel="Add Project"
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
          totalItems: filteredProjects.length,
          onPageChange: setPageIndex,
          onPageSizeChange: setPageSize,
          showPagination: true,
          pageSizeOptions: [5, 10, 20, 50]
        }}
      />

      {/* Project Creation Dialog */}
      <CreateProjectDialog
        isOpen={dialogState.create.isOpen}
        onClose={dialogState.create.onClose}
        onSubmit={dialogState.create.onSubmit}
      />

      {/* Project Edit Dialog */}
      <EditProjectDialog
        isOpen={dialogState.edit.isOpen}
        onClose={dialogState.edit.onClose}
        onSubmit={dialogState.edit.onSubmit}
        project={dialogState.edit.project}
      />

      {/* Project Deletion Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={dialogState.delete.isOpen}
        onClose={dialogState.delete.onClose}
        onConfirm={dialogState.delete.onConfirm}
        title="Delete Project"
        description={`Are you sure you want to delete the project "${dialogState.delete.selectedProject?.name}"? This action cannot be undone and will permanently delete all associated documents and files.`}
        confirmationText="delete"
        confirmButtonText="Delete Project"
        variant="destructive"
      />

      {/* Bulk Deletion Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={dialogState.bulkDelete.isOpen}
        onClose={dialogState.bulkDelete.onClose}
        onConfirm={dialogState.bulkDelete.onConfirm}
        title={`Delete ${selectedProjects.length} Project${selectedProjects.length === 1 ? '' : 's'}`}
        description={`Are you sure you want to delete ${selectedProjects.length} selected project${selectedProjects.length === 1 ? '' : 's'}? This action cannot be undone and will permanently delete all associated documents and files.`}
        confirmationText="delete all"
        confirmButtonText={`Delete ${selectedProjects.length} Project${selectedProjects.length === 1 ? '' : 's'}`}
        variant="destructive"
      />
    </>
  );
}
