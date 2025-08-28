import { useMemo, useCallback, useState } from 'react';
import { Eye, Plus, Copy, Edit, Trash2, Settings2, ArrowLeft, Bot, Scissors } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/components/features/data-table';
import { Badge } from '@/components/ui/badge';
import { columns, adaptColumns } from '@/components/features/data-table/columns';
import { EmptyState } from '@/components/shared/empty-state';
import { CreateProjectDialog, EditProjectDialog } from './dialogs';
import { ProjectAiSettingsDialog } from './dialogs/project-ai-settings-dialog';
import { TypedConfirmationDialog } from '@/components/shared/typed-confirmation-dialog';
import { FormConfirmationDialog } from '@/components/shared';
import { useProjectsView } from './use-projects-view';
import { useAiProcessing } from '@/providers/ai-processing-provider';
import { useProjectTrust } from '@/providers/project-trust-provider';
import { startProjectRun } from '@/lib/ai-runner';
import { DocumentsAPI } from '@/lib/documents-api';
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
    'contact_name', 'contact_email', 'created_at',
    'has_template',
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

  const aiProc = useAiProcessing();
  const { ensureProjectTrust } = useProjectTrust();

  // Run Project Redaction dialog state
  const [runRedaction, setRunRedaction] = useState<{ isOpen: boolean; project: ProjectShallowType | null }>({ isOpen: false, project: null });

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
    columns.number<ProjectShallowType>('document_count', {
      header: '# Documents',
      width: '150px',
      sortable: true
    }),

    // Scoped indicator - project has a project-scoped document (template)
    columns.custom<ProjectShallowType, boolean>('has_template', 'has_template', {
      header: 'Template',
      width: '100px',
      align: 'left',
      render: (_value, row) => row.has_template ? (
        <Badge variant="outline" status="success" title="Project has a scoped document">Present</Badge>
      ) : (
        <Badge variant="outline" status="muted" title="Project doesn't have a scoped document">Unavailable</Badge>
      ),
    }),

    // Contact person - truncated
    columns.text<ProjectShallowType>('contact_name', {
      header: 'Contact Person',
      maxLength: 20,
      width: '200px'
    }),

    // Contact email - truncated with monospace font
    columns.text<ProjectShallowType>('contact_email', {
      header: 'Contact Email',
      maxLength: 25,
      width: '200px'
    }),

    // Created date - relative formatting
    columns.date<ProjectShallowType>('created_at', {
      header: 'Created',
      width: '150px',
      sortable: true,
      format: { style: 'relative' }
    }),

    // Last updated - relative date formatting
    columns.date<ProjectShallowType>('updated_at', {
      header: 'Last Updated',
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
          id: 'ai-settings',
          label: 'AI Settings',
          icon: Settings2,
          onClick: actionHandlers.onOpenAiSettings
        },
        {
          id: 'run-ai',
          label: 'Run AI (project)',
          icon: Bot,
          onClick: async (project) => {
            try {
              const { keyId, encryptedPassword } = await ensureProjectTrust(project.id);
              startProjectRun(aiProc as any, project.id, { keyId, encryptedPassword });
              toast.success('Project AI run started', { description: project.name });
            } catch (e) {
              // User cancelled or encryption failed
              toast.info('Project AI run cancelled');
            }
          }
        },
        {
          id: 'run-redaction',
          label: 'Run Project Redaction',
          icon: Scissors,
          onClick: (project) => setRunRedaction({ isOpen: true, project }),
          hidden: (row) => !row.has_template,
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

      {/* Project AI Settings Dialog */}
      <ProjectAiSettingsDialog
        isOpen={dialogState.ai.isOpen}
        onClose={dialogState.ai.onClose}
        onSubmit={dialogState.ai.onSubmit}
        initial={undefined}
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

      {/* Run Project Redaction Dialog */}
      <FormConfirmationDialog
        isOpen={runRedaction.isOpen}
        onClose={() => setRunRedaction({ isOpen: false, project: null })}
        title="Run Project Redaction"
        description="Generate redacted PDFs for every document in this project using committed selections."
        confirmButtonText="Run"
        cancelButtonText="Cancel"
        variant="destructive"
        messages={([
          { variant: 'warning', title: 'Batch operation', description: 'This will start processing for all project documents. Existing redacted files will be replaced.' },
        ] as any)}
        initialValues={{ includeDocumentScoped: false }}
        fields={[
          { type: 'switch', name: 'includeDocumentScoped', label: 'Include document-scoped selections', tooltip: 'Off = only committed project-scoped selections' },
        ]}
        onSubmit={async (values) => {
          const project = runRedaction.project;
          if (!project) return;
          try {
            const { keyId, encryptedPassword } = await ensureProjectTrust(project.id);
            // Fetch documents in this project
            const docsRes = await DocumentsAPI.fetchDocumentsForProject(project.id, 0, 10_000);
            if (!docsRes.ok) throw docsRes.error as any;
            const docs = docsRes.value;
            if (docs.length === 0) {
              toast.info('No documents in this project');
              return;
            }
            // Kick off processing for each document
            const results = await Promise.allSettled(
              docs.map(d => DocumentsAPI.processDocumentEncrypted(d.id, { keyId, encryptedPassword }))
            );
            const okCount = results.filter(r => r.status === 'fulfilled' && (r as any).value?.ok !== false).length;
            const failCount = results.length - okCount;
            toast.success('Project redaction triggered', { description: `${okCount} started, ${failCount} failed to start` });
          } catch (e) {
            toast.error('Failed to start project redaction');
          } finally {
            setRunRedaction({ isOpen: false, project: null });
          }
        }}
      />

      {/* Project Deletion Confirmation Dialog */}
      <TypedConfirmationDialog
        isOpen={dialogState.delete.isOpen}
        onClose={dialogState.delete.onClose}
        onConfirm={dialogState.delete.onConfirm}
        title="Delete Project"
        description={`Are you sure you want to delete the project "${dialogState.delete.selectedProject?.name}"?`}
        confirmationText="delete"
        confirmButtonText="Delete Project"
        variant="destructive"
        messages={[
          { variant: 'warning', title: 'Irreversible', description: 'This action cannot be undone.' },
          { variant: 'error', title: 'Data loss', description: 'All associated documents and files will be permanently deleted.' },
        ]}
      />

      {/* Bulk Deletion Confirmation Dialog */}
      <TypedConfirmationDialog
        isOpen={dialogState.bulkDelete.isOpen}
        onClose={dialogState.bulkDelete.onClose}
        onConfirm={dialogState.bulkDelete.onConfirm}
        title={`Delete ${selectedProjects.length} Project${selectedProjects.length === 1 ? '' : 's'}`}
        description={`Are you sure you want to delete ${selectedProjects.length} selected project${selectedProjects.length === 1 ? '' : 's'}?`}
        confirmationText="delete"
        confirmButtonText={`Delete ${selectedProjects.length} Project${selectedProjects.length === 1 ? '' : 's'}`}
        variant="destructive"
        messages={[
          { variant: 'warning', title: 'Irreversible', description: 'This action cannot be undone.' },
          { variant: 'error', title: 'Data loss', description: 'All associated documents and files will be permanently deleted.' },
        ]}
      />
    </>
  );
}
