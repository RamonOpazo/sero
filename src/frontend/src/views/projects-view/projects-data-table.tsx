import { useMemo, useCallback } from 'react';
import { Eye, Plus } from 'lucide-react';
import { DataTable, createColumn, Actions } from '@/components/features/data-table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { CreateProjectDialog, EditProjectDialog } from './dialogs';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { useProjectsView } from './use-projects-view';
import type { ProjectShallowType } from '@/types';

interface ProjectsDataTableProps {
  onProjectSelect?: (project: ProjectShallowType) => void;
}

export function ProjectsDataTable({ onProjectSelect }: ProjectsDataTableProps) {
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

  const columns = useMemo(() => [
    // Name column - pinned and clickable
    {
      id: 'name',
      key: 'name',
      header: 'Project Name',
      accessorKey: 'name',
      cell: (_: any, row: ProjectShallowType) => nameRenderer(row),
      enableSorting: true,
      pinFirstColumn: true,
    },
    
    // Document count
    createColumn.badge<ProjectShallowType>('document_count')
      .header('Documents')
      .sortable()
      .width('120px')
      .build(),
    
    // Updated date
    createColumn.date<ProjectShallowType>('updated_at')
      .header('Last Updated')
      .sortable()
      .width('150px')
      .build(),
    
    // Description
    createColumn.text<ProjectShallowType>('description')
      .header('Description')
      .truncate(40)
      .width('200px')
      .build(),
    
    // Contact person
    createColumn.text<ProjectShallowType>('contact_name')
      .header('Contact Person')
      .truncate(20)
      .width('150px')
      .build(),
    
    // Version
    {
      id: 'version',
      key: 'version',
      header: 'Version',
      accessorKey: 'version',
      cell: (_: any, row: ProjectShallowType) => (
        <Badge variant="outline">{row.version}</Badge>
      ),
      enableSorting: true,
    },
    
    // Contact email
    createColumn.text<ProjectShallowType>('contact_email')
      .header('Email Address')
      .truncate(25)
      .width('180px')
      .build(),
    
    // Created date
    createColumn.date<ProjectShallowType>('created_at')
      .header('Created')
      .sortable()
      .width('150px')
      .build(),

  ], [actionHandlers, nameRenderer]);

  const tableActions = useMemo(() => Actions.create<ProjectShallowType>()
    .copy(
      (project) => project.id,
      'Copy project ID'
    )
    .separator()
    .custom(
      'Select Project',
      'select',
      actionHandlers.onSelectProject,
      {
        icon: Eye,
        variant: 'default'
      }
    )
    .edit(actionHandlers.onEditProject, 'Edit project')
    .delete(actionHandlers.onDeleteProject, 'Delete project')
    .build(), [actionHandlers]);

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
        columns={columns}
        data={projects}
        selectedRows={selectedProjects}
        onRowSelect={actionHandlers.onRowSelectionChange}
        searchPlaceholder="Search projects..."
        onAddNew={actionHandlers.onCreateProject}
        actions={tableActions}
        showCheckboxes={true}
        showActions={true}
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
