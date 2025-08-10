import { useMemo, useCallback } from 'react';
import { Eye, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, Column, Actions } from '@/components/features/data-table';
import { EmptyState } from '@/components/shared/EmptyState';
import { useRefactorProject } from '@/context/RefactorProjectProvider';
import type { ProjectShallowType } from '@/types';

interface RefactorProjectsDataTableProps {
  onProjectSelect?: (project: ProjectShallowType) => void;
}

export function RefactorProjectsDataTable({ onProjectSelect }: RefactorProjectsDataTableProps) {
  const { state } = useRefactorProject();

  const handleSelectProject = useCallback(async (project: ProjectShallowType) => {
    if (onProjectSelect) {
      onProjectSelect(project);
    }
  }, [onProjectSelect]);

  const handleCreateProject = useCallback(() => {
    // TODO: Implement project creation
    toast.info('Project creation not yet implemented');
  }, []);

  const handleEditProject = useCallback((project: ProjectShallowType) => {
    // TODO: Implement project editing
    toast.info(`Edit project: ${project.name} - Not yet implemented`);
  }, []);

  const handleDeleteProject = useCallback((project: ProjectShallowType) => {
    // TODO: Implement project deletion
    toast.info(`Delete project: ${project.name} - Not yet implemented`);
  }, []);

  const handleCopyProjectId = useCallback((project: ProjectShallowType) => {
    navigator.clipboard.writeText(project.id);
    toast.success('Project ID copied to clipboard', {
      description: `ID: ${project.id}`,
    });
  }, []);

  const nameRenderer = useCallback((project: ProjectShallowType) => {
    return (
      <button
        onClick={() => handleSelectProject(project)}
        className="text-left font-medium text-primary hover:text-primary/80 hover:underline focus:outline-none focus:underline transition-colors"
        title={`Select project: ${project.name}`}
      >
        {project.name.length > 30 ? `${project.name.slice(0, 30)}...` : project.name}
      </button>
    );
  }, [handleSelectProject]);

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
        'Copy project ID',
        handleCopyProjectId
      )
      .separator()
      .custom({
        label: 'Select Project',
        icon: Eye,
        onClick: handleSelectProject,
        variant: 'default'
      })
      .edit(handleEditProject, 'Edit project')
      .delete(handleDeleteProject, 'Delete project')
      .build()
  ], [handleSelectProject, handleEditProject, handleDeleteProject, handleCopyProjectId, nameRenderer]);

  if (state.isLoadingProjects) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (state.projectsError) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load projects</p>
          <p className="text-sm text-muted-foreground">{state.projectsError}</p>
        </div>
      </div>
    );
  }

  if (state.projects.length === 0) {
    return (
      <EmptyState
        message="No projects found"
        buttonText="Create your first project"
        buttonIcon={<Plus className="h-4 w-4" />}
        onButtonClick={handleCreateProject}
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={state.projects}
      selection={state.currentProject ? [state.currentProject] : []}
      searchKey="name"
      searchPlaceholder="Search projects..."
      onCreateEntries={handleCreateProject}
      enableRowSelection={false} // We handle selection through actions
      enableDeleteSelection={false} // We handle deletion through actions
      pageSize={10}
    />
  );
}
