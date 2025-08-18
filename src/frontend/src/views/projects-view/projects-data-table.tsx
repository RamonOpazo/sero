import { useMemo, useCallback } from 'react';
import { Eye, Plus } from 'lucide-react';
import { DataTable, createColumn, column, Actions } from '@/components/features/data-table';
import { DateDisplay, CountBadge, TextDisplay } from '@/components/features/data-table/ui-utils';
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
    // Custom clickable name column - pinned to left
    createColumn(column.custom<ProjectShallowType>(
      'name',
      'Project Name',
      (_, row) => nameRenderer(row),
      { 
        sortable: true,
        responsive: {
          pinned: 'left',
          priority: 0,
          minWidth: 200
        }
      }
    )),
    
    // Document count as badge - scrollable, high priority
    createColumn(column.create<ProjectShallowType>(
      'document_count', 
      'Documents',
      {
        sortable: true,
        render: (value) => (
          <CountBadge count={value as number} />
        ),
        responsive: {
          priority: 1,
          minWidth: 100,
          pinned: false
        }
      }
    )),
    
    // Updated date - scrollable, medium priority
    createColumn(column.create<ProjectShallowType>(
      'updated_at',
      'Last Updated',
      {
        sortable: true,
        render: (value) => (
          <DateDisplay date={value as string} />
        ),
        responsive: {
          priority: 2,
          minWidth: 120,
          pinned: false
        }
      }
    )),
    
    // Description with truncation - scrollable, lower priority
    createColumn(column.create<ProjectShallowType>(
      'description',
      'Description',
      {
        render: (value) => (
          <TextDisplay text={value as string} truncate={40} />
        ),
        responsive: {
          priority: 3,
          minWidth: 200,
          pinned: false
        }
      }
    )),
    
    // Contact person with truncation - scrollable, lower priority
    createColumn(column.create<ProjectShallowType>(
      'contact_name',
      'Contact Person',
      {
        render: (value) => (
          <TextDisplay text={value as string} truncate={20} />
        ),
        responsive: {
          priority: 4,
          minWidth: 150,
          pinned: false
        }
      }
    )),
    
    // Version as badge - scrollable, lower priority
    createColumn(column.create<ProjectShallowType>(
      'version',
      'Version',
      {
        sortable: true,
        render: (value) => (
          <CountBadge count={value as string} variant="outline" />
        ),
        responsive: {
          priority: 5,
          minWidth: 80,
          pinned: false
        }
      }
    )),
    
    // Email with truncation - scrollable, lower priority
    createColumn(column.create<ProjectShallowType>(
      'contact_email',
      'Email Address',
      {
        render: (value) => (
          <TextDisplay text={value as string} truncate={25} />
        ),
        responsive: {
          priority: 6,
          minWidth: 180,
          pinned: false
        }
      }
    )),
    
    // Created date - scrollable, lowest priority
    createColumn(column.create<ProjectShallowType>(
      'created_at',
      'Created',
      {
        sortable: true,
        render: (value) => (
          <DateDisplay date={value as string} />
        ),
        responsive: {
          priority: 7,
          minWidth: 120,
          pinned: false
        }
      }
    )),

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
        selection={selectedProjects}
        searchKey="name"
        searchPlaceholder="Search projects..."
        onRowSelectionChange={actionHandlers.onRowSelectionChange}
        onCreateEntries={actionHandlers.onCreateProject}
        onDeleteSelection={actionHandlers.onBulkDelete}
        enableRowSelection={true} // Enable checkboxes for bulk operations
        enableDeleteSelection={selectedProjects.length > 0} // Enable bulk delete when items are selected
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
