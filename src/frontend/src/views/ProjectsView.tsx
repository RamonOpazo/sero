import { useCallback, useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Widget, WidgetContainer, WidgetDescription, WidgetHeader, WidgetTitle } from "@/components/shared/Widget"
import { DataTable, Column, Actions } from '@/components/features/data-table'
import { CreateProjectDialog, EditProjectDialog, ConfirmationDialog } from '@/components/dialogs'
import { getRandomEasterEgg } from '@/utils/content'
import type { ProjectType, ProjectCreateType, ProjectUpdateType } from '@/types'
import { useProjects } from './useProject'

export function ProjectsView() {
  const { projects, refreshProjects, createProject, deleteSelectedProjects, editSelectedProject } = useProjects();
  const navigate = useNavigate()
  const [selectedProjects, setSelectedProjects] = useState<ProjectType[]>([])
  const [projectToEdit, setProjectToEdit] = useState<ProjectType | null>(null)
  const [projectsToDelete, setProjectsToDelete] = useState<ProjectType[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const handleSelectionChange = useCallback((selectedRows: ProjectType[]) => {
    setSelectedProjects(selectedRows)
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedProjects.length > 0) {
      setProjectsToDelete(selectedProjects);
    }
  }, [selectedProjects]);

  const handleConfirmDelete = useCallback(async () => {
    await deleteSelectedProjects(projectsToDelete)
    setSelectedProjects(current => current.filter(p => !projectsToDelete.includes(p)))
    setProjectsToDelete([])
  }, [projectsToDelete, deleteSelectedProjects])

  const handleCreateProject = async (projectData: ProjectCreateType) => {
    await createProject(projectData);
  };

  const handleDeleteSingleProject = useCallback((project: ProjectType) => {
    setProjectsToDelete([project]);
  }, [])

  const handleEditProject = useCallback((project: ProjectType) => {
    setProjectToEdit(project);
  }, [])

  const handleEditProjectSubmit = useCallback(async (projectData: ProjectUpdateType) => {
    if (projectToEdit) {
      await editSelectedProject(projectToEdit, projectData);
    }
  }, [projectToEdit, editSelectedProject]);

  const handleDownloadRedactedFiles = useCallback(async () => {
    // TODO: download files
    toast.error("Not yet implemented");
  }, [])

  const columns = useMemo(() => [
    Column.text<ProjectType>('name').truncate(25).sortable().build(),
    Column.text<ProjectType>('description').header('Description').truncate().build(),
    Column.badge<ProjectType>('document_count').sortable('Documents').build(),
    Column.badge<ProjectType>('obfuscated_count').sortable('Obfuscated').build(),
    Column.status<ProjectType>('status').sortable().build(),
    Column.date<ProjectType>('created_at').sortable('Created').build(),
    Column.date<ProjectType>('updated_at').sortable('Updated').build(),
    Actions.create<ProjectType>()
      .copy(
        (project) => project.id,
        'Copy project ID',
        (id) => ({
          title: 'Project ID copied to clipboard',
          description: `ID: ${id}`
        })
      )
      .separator()
      .custom({
        label: 'View Documents',
        icon: Eye,
        onClick: (project) => {
          navigate(`/projects/${project.id}/documents`);
        }
      })
      .download(handleDownloadRedactedFiles, 'Download obfuscated files')
      .edit(handleEditProject, 'Edit project')
      .delete(handleDeleteSingleProject, 'Delete project')
      .build()
  ], [navigate, handleEditProject, handleDeleteSingleProject, handleDownloadRedactedFiles])

  const isSingleProjectDelete = projectsToDelete.length === 1;

  return (
    <WidgetContainer expanded>
      <Widget>
        <WidgetHeader>
          <WidgetTitle>Projects {`(${projects?.length})` || 'Loading...'}</WidgetTitle>
          <WidgetDescription>
            <span>{getRandomEasterEgg()}</span>
          </WidgetDescription>
        </WidgetHeader>
      </Widget>

      {projects.length > 0 ? (
        <DataTable
          columns={columns}
          data={projects}
          selection={selectedProjects}
          searchKey="name"
          searchPlaceholder="Search projects..."
          onRowSelectionChange={handleSelectionChange}
          onDeleteSelection={handleDeleteSelected}
          onCreateEntries={() => setIsCreateDialogOpen(true)}
          pageSize={10}
        />
      ) : (
        <EmptyState
          message="No projects found"
          buttonText="Create your first project"
          buttonIcon={<Plus className="h-4 w-4" />}
          onButtonClick={() => setIsCreateDialogOpen(true)}
        />
      )}

      <CreateProjectDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateProject}
      />

      <EditProjectDialog
        isOpen={!!projectToEdit}
        onClose={() => setProjectToEdit(null)}
        onSubmit={handleEditProjectSubmit}
        project={projectToEdit}
      />

      <ConfirmationDialog
        isOpen={projectsToDelete.length > 0}
        onClose={() => setProjectsToDelete([])}
        onConfirm={handleConfirmDelete}
        title={isSingleProjectDelete ? "Delete Project" : `Delete ${projectsToDelete.length} Projects`}
        description={
          isSingleProjectDelete
            ? `You are about to permanently delete the project "${projectsToDelete[0]?.name}". This action cannot be undone and will remove all associated data including documents, files, and configurations.`
            : `You are about to permanently delete ${projectsToDelete.length} projects. This action cannot be undone and will remove all associated data including documents, files, and configurations.`
        }
        confirmationText="delete"
        confirmButtonText="Delete Forever"
        variant="destructive"
      />
    </WidgetContainer>
  )
}
