import { useMemo, useCallback } from 'react';
import { Eye, Plus } from 'lucide-react';
import { DataTable, ColumnBuilder as Column, Actions } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { CreateProjectDialog, EditProjectDialog } from './dialogs';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { useProjectsView } from '@/components/projects-view/use-projects-view';
import type { ProjectShallowType } from '@/types';

interface ProjectsDataTableProps {
  onProjectSelect?: (project: ProjectShallowType) => void;
}

export function ProjectsDataTable({ onProjectSelect }: ProjectsDataTableProps) {
  // Extract all business logic to custom hook
  const {
    projects,
    currentProject,
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
    // Custom clickable name column
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'name',
      cell: ({ row }) => nameRenderer(row.original),
      enableSorting: true,
    },
    
    Column.text<ProjectShallowType>('description')
      .header('Description')
      .truncate(40)
      .build(),
    
    Column.badge<ProjectShallowType>('document_count')
      .header('Documents')
      .sortable()
      .build(),
    
    Column.text<ProjectShallowType>('contact_name')
      .header('Contact')
      .truncate(20)
      .build(),
    
    Column.text<ProjectShallowType>('contact_email')
      .header('Email')
      .truncate(25)
      .build(),
    
    Column.badge<ProjectShallowType>('version')
      .header('Version')
      .sortable()
      .build(),
    
    Column.date<ProjectShallowType>('created_at')
      .header('Created')
      .sortable()
      .build(),
    
    Column.date<ProjectShallowType>('updated_at')
      .header('Updated')
      .sortable()
      .build(),

    Actions.create<ProjectShallowType>()
      .copy(
        (project) => project.id,
        'Copy project ID'
      )
      .separator()
      .custom({
        label: 'Select Project',
        icon: Eye,
        onClick: actionHandlers.onSelectProject,
        variant: 'default'
      })
      .edit(actionHandlers.onEditProject, 'Edit project')
      .delete(actionHandlers.onDeleteProject, 'Delete project')
      .build()
  ], [actionHandlers, nameRenderer]);

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
        selection={currentProject ? [currentProject] : []}
        searchKey="name"
        searchPlaceholder="Search projects..."
        onCreateEntries={actionHandlers.onCreateProject}
        enableRowSelection={false} // We handle selection through actions
        enableDeleteSelection={false} // We handle deletion through actions
        pageSize={10}
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
    </>
  );
}
