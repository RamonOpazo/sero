import { useMemo, useCallback, useState } from 'react';
import { FolderInput, Plus, Copy, Edit, Trash2, Settings2, ArrowLeft, Bot, Scissors, Download } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/components/features/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import type { ProjectShallowType } from '@/types';
import type { ColumnOption, CustomButtonOption } from '@/components/features/data-table/types';

interface ProjectsDataTableProps {
  // Parent-provided data and handlers (table-focused)
  projects: ProjectShallowType[]
  selectedProjects: ProjectShallowType[]
  isLoading: boolean
  error: string | null
  actionHandlers: {
    onSelectProject: (p: ProjectShallowType) => void
    onCreateProject: () => void
    onEditProject: (p: ProjectShallowType) => void
    onDeleteProject: (p: ProjectShallowType) => void
    onOpenAiSettings: (p: ProjectShallowType) => void
    onRunAiDetection?: (p: ProjectShallowType) => void
    onRunRedaction?: (p: ProjectShallowType) => void
    onDownloadRedactions?: (p: ProjectShallowType) => void
    onRowSelectionChange: (rows: ProjectShallowType[]) => void
    onBulkDelete: () => void
    onBackHome?: () => void
  }
}

export function ProjectsDataTable({ projects, selectedProjects, isLoading, error, actionHandlers }: ProjectsDataTableProps) {
  // Pagination state
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  // Search state
  const [searchValue, setSearchValue] = useState('')

  // Column visibility state - exclude pinned columns from state management
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'description', 'document_count', 'updated_at',
    'contact_name', 'contact_email', 'created_at',
    'has_template',
  ])

  // All dialogs lifted to ProjectsView

  // Pure UI rendering functions
  const nameRenderer = useCallback((project: ProjectShallowType) => {
    return (
      <Button
        variant="link"
        onClick={() => actionHandlers.onSelectProject(project)}
        title={`Select project: ${project.name}`}
        className="p-0"
      >
        {project.name.length > 30 ? `${project.name.slice(0, 30)}...` : project.name}
      </Button>
    );
  }, [actionHandlers.onSelectProject]);

  // Define columns using the simple declarative system
  const projectColumnDefs = useMemo(() => [
    // Project name - pinned, clickable, custom renderer
    {
      id: 'name',
      type: 'select',
      header: 'Project Name',
      accessor: 'name',
      pinned: true,
      sortable: true,
      width: '150px',
      render: (_value: string, row: ProjectShallowType) => nameRenderer(row),
    },
    {
      id: 'description',
      type: 'text',
      header: 'Description',
      accessor: 'description',
      maxLength: 40,
      width: '200px',
      placeholder: 'No description',
    },
    {
      id: 'document_count',
      type: 'number',
      header: '# Documents',
      accessor: 'document_count',
      width: '150px',
      sortable: true,
    },
    {
      id: 'has_template',
      type: 'custom',
      header: 'Template',
      accessor: 'has_template',
      width: '100px',
      align: 'left',
      render: (_value: boolean, row: ProjectShallowType) => row.has_template ? (
        <Badge variant="outline" status="success" title="Project has a scoped document">Present</Badge>
      ) : (
        <Badge variant="outline" status="muted" title="Project doesn't have a scoped document">Unavailable</Badge>
      ),
    },
    {
      id: 'contact_name',
      type: 'text',
      header: 'Contact Person',
      accessor: 'contact_name',
      maxLength: 20,
      width: '200px',
    },
    {
      id: 'contact_email',
      type: 'text',
      header: 'Contact Email',
      accessor: 'contact_email',
      maxLength: 25,
      width: '200px',
    },
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
    {
      id: 'actions',
      type: 'actions',
      header: 'Actions',
      width: '5rem',
      align: 'right',
      actions: [
        {
          id: 'copy',
          label: 'Copy ID',
          icon: Copy,
          onClick: (project: ProjectShallowType) => {
            navigator.clipboard.writeText(project.id)
            toast.success('Project ID copied to clipboard', {
              description: `ID: ${project.id}`,
            })
          },
        },
        {
          id: 'select',
          label: 'Select project',
          icon: FolderInput,
          onClick: (project: ProjectShallowType) => {
            actionHandlers.onSelectProject(project)
            toast.success('Project selected', {
              description: `Switched to project: ${project.name}`,
            })
          },
        },
        {
          id: 'edit',
          label: 'Edit project',
          icon: Edit,
          onClick: actionHandlers.onEditProject,
        },
        {
          id: 'ai-settings',
          label: 'AI Settings',
          icon: Settings2,
          onClick: actionHandlers.onOpenAiSettings,
        },
        {
          id: 'run-ai-detection',
          label: 'Run AI Detection',
          icon: Bot,
          onClick: (project: ProjectShallowType) => actionHandlers.onRunAiDetection?.(project),
        },
        {
          id: 'run-redaction',
          label: 'Run Redaction',
          icon: Scissors,
          onClick: (project: ProjectShallowType) => actionHandlers.onRunRedaction?.(project),
          disabled: (row: ProjectShallowType) => !row.has_template,
        },
        {
          id: 'download-redactions',
          label: 'Download redactions',
          icon: Download,
          onClick: (project: ProjectShallowType) => actionHandlers.onDownloadRedactions?.(project),
        },
        {
          id: 'delete',
          label: 'Delete project',
          icon: Trash2,
          variant: 'destructive',
          onClick: actionHandlers.onDeleteProject,
        },
      ],
    },
  ], [nameRenderer, actionHandlers])

  // Column options for visibility toggle - derive from column defs (exclude pinned/actions)
  const tableColumns: ColumnOption[] = useMemo(() => {
    return projectColumnDefs
      .filter((col) => col.id !== 'name' && col.id !== 'actions')
      .map((col) => ({ key: col.id, header: String(col.header ?? col.id) }))
  }, [projectColumnDefs])

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
  const visibleProjectColumnDefs = useMemo(() => {
    return projectColumnDefs.filter(col => {
      if (col.id === 'actions' || col.id === 'name') {
        return true
      }
      return visibleColumns.includes(col.id)
    })
  }, [projectColumnDefs, visibleColumns])


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

  const content = (() => {
    if (error) {
      return (
        <EmptyState
          message={
            <>
              <p>{"Failed to load projects"}</p>
              <p>{error}</p>
            </>
          }
          buttonText="Back to Projects"
          buttonIcon={<ArrowLeft />}
          onButtonClick={actionHandlers.onBackHome}
        />
      );
    }

    if (isLoading) {
      return (
        <EmptyState
          variant="await"
          message="Loading projects..."
        />
      );
    }

    if (projects.length > 0) {
      return (
        <DataTable
          columnDefs={visibleProjectColumnDefs as any}
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
      );
    }

    // Fallback: projects loading did not error but no data was fetched (no projects)
    return (
      <EmptyState
        message="No projects found"
        buttonText="Create your first project"
        buttonIcon={<Plus />}
        onButtonClick={actionHandlers.onCreateProject}
      />
    );
  })();

  return (
    <>
      {content}
    </>
  );
}
