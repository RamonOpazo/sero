import { useCallback, useEffect, useState, useMemo } from 'react'
import { Plus, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, Column, Actions } from '@/components/features/data-table'
import { EmptyState } from '@/components/atomic/EmptyState'
import { CreateProjectDialog } from '@/components/dialogs/CreateProjectDialog'
import { EditProjectDialog } from '@/components/dialogs/EditProjectDialog'
import { ConfirmationDialog } from '@/components/dialogs/ConfirmationDialog'
import { getRandomEasterEgg } from '@/utils/content'
import type { Project, ProjectCreate } from '@/types'
import {
  Widget,
  WidgetContainer,
  WidgetDescription,
  WidgetHeader,
  WidgetTitle,
} from "@/components/atomic/Widget"

export function ProjectsView() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjects, setSelectedProjects] = useState<Project[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSingleDeleteDialogOpen, setIsSingleDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null)

  useEffect(() => {
    // Fetch projects from backend
    fetch('/api/projects')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        return res.json()
      })
      .then(data => {
        console.log('Projects loaded:', data.length, 'projects')
        setProjects(data)
      })
      .catch(err => {
        console.error('Error fetching projects:', err)
        toast.error('Failed to load projects', {
          description: 'Please refresh the page to try again.'
        })
      })
  }, [])


  const handleSelectionChange = useCallback((selectedRows: Project[]) => {
    setSelectedProjects(selectedRows)
  }, [])

  const handleDeleteSelected = useCallback(() => {
    if (selectedProjects.length === 0) return
    setIsDeleteDialogOpen(true)
  }, [selectedProjects])

  const handleConfirmDelete = useCallback(async () => {
    const projectCount = selectedProjects.length
    const projectNames = selectedProjects.map(p => p.name).join(', ')

    try {
      const deletePromises = selectedProjects.map(project =>
        fetch(`/api/projects/id/${project.id}`, {
          method: 'DELETE',
        })
      )

      await Promise.all(deletePromises)

      // Refresh the projects list
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
        setSelectedProjects([])

        toast.success(`Successfully deleted ${projectCount} project${projectCount !== 1 ? 's' : ''}`, {
          description: projectCount === 1 ? `Deleted "${projectNames}"` : `Deleted ${projectCount} projects`
        })
      } else {
        throw new Error('Failed to refresh project list after deletion')
      }
    } catch (error) {
      console.error('Error deleting projects:', error)
      toast.error('Failed to delete projects', {
        description: error instanceof Error ? error.message : 'Please try again.'
      })
      throw error // Let the dialog handle the error
    }
  }, [selectedProjects])

  const handleCreateProject = useCallback(async (projectData: ProjectCreate) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      })

      if (response.ok) {
        // Refresh the projects list
        const projectsResponse = await fetch('/api/projects')
        if (projectsResponse.ok) {
          const data = await projectsResponse.json()
          setProjects(data)

          toast.success('Project created successfully', {
            description: `Created "${projectData.name}"`
          })
        } else {
          throw new Error('Failed to refresh project list after creation')
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to create project (${response.status})`)
      }
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error('Failed to create project', {
        description: error instanceof Error ? error.message : 'Please try again.'
      })
      throw error // Re-throw to let the dialog handle the error display
    }
  }, [])

  const handleDeleteSingleProject = useCallback((project: Project) => {
    setProjectToDelete(project)
    setIsSingleDeleteDialogOpen(true)
  }, [])

  const handleConfirmSingleDelete = useCallback(async () => {
    if (!projectToDelete) return

    try {
      const response = await fetch(`/api/projects/id/${projectToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Refresh the projects list
        const projectsResponse = await fetch('/api/projects')
        if (projectsResponse.ok) {
          const data = await projectsResponse.json()
          setProjects(data)

          toast.success('Project deleted successfully', {
            description: `Deleted "${projectToDelete.name}"`
          })
        } else {
          throw new Error('Failed to refresh project list after deletion')
        }
      } else {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Failed to delete project (${response.status}): ${errorText}`)
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      toast.error('Failed to delete project', {
        description: error instanceof Error ? error.message : 'Please try again.'
      })
      throw error // Let the dialog handle the error
    }
  }, [projectToDelete])

  const handleEditProject = useCallback((project: Project) => {
    setProjectToEdit(project)
    setIsEditDialogOpen(true)
  }, [])

  const handleEditProjectSubmit = useCallback(async (projectData: { name: string; description: string }) => {
    if (!projectToEdit) return

    try {
      const response = await fetch(`/api/projects/id/${projectToEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectData.name.trim(),
          description: projectData.description.trim(),
        }),
      })

      if (response.ok) {
        // Refresh the projects list
        const projectsResponse = await fetch('/api/projects')
        if (projectsResponse.ok) {
          const data = await projectsResponse.json()
          setProjects(data)

          toast.success('Project updated successfully', {
            description: `Updated "${projectData.name}"`
          })
        } else {
          throw new Error('Failed to refresh project list after update')
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to update project (${response.status})`)
      }
    } catch (error) {
      console.error('Error updating project:', error)
      toast.error('Failed to update project', {
        description: error instanceof Error ? error.message : 'Please try again.'
      })
      throw error // Re-throw to let the dialog handle the error display
    }
  }, [projectToEdit])

  const handleDownloadObfuscatedFiles = useCallback(async (project: Project) => {
    // Check if there are any obfuscated files to download
    const obfuscatedCount = (project as any).obfuscated_count || 0

    if (obfuscatedCount === 0) {
      toast.error('No obfuscated files available', {
        description: 'This project has no obfuscated files to download.'
      })
      return
    }

    // Show loading toast
    const loadingToast = toast.loading('Preparing download...', {
      description: `Collecting ${obfuscatedCount} obfuscated file${obfuscatedCount !== 1 ? 's' : ''}`
    })

    try {
      const response = await fetch(`/api/projects/id/${project.id}/files/obfuscated/download`)

      if (response.ok) {
        // Create a blob from the response
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${project.name}_obfuscated_files.zip`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        // Success toast
        toast.success('Download started successfully', {
          id: loadingToast,
          description: `Downloaded ${obfuscatedCount} obfuscated file${obfuscatedCount !== 1 ? 's' : ''} from "${project.name}"`
        })
      } else {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Server error (${response.status}): ${errorText}`)
      }
    } catch (error) {
      console.error('Error downloading obfuscated files:', error)
      toast.error('Download failed', {
        id: loadingToast,
        description: error instanceof Error ? error.message : 'Failed to download obfuscated files. Please try again.'
      })
    }
  }, [])

  // Define columns using our new column builders
  const columns = useMemo(() => [
    Column.text<Project>('name').sortable().withClass("font-medium").build(),
    Column.text<Project>('description').header('Description').truncate().build(),
    Column.badge<Project>('document_count').sortable('Documents').build(),
    Column.badge<Project>('obfuscated_count').sortable('Obfuscated').build(),
    Column.status<Project>('status').sortable().build(),
    Column.date<Project>('created_at').sortable('Created').build(),
    Column.date<Project>('updated_at').sortable('Updated').build(),
    Actions.create<Project>()
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
          window.location.href = `/projects/${project.id}/documents`
        }
      })
      .download(handleDownloadObfuscatedFiles, 'Download obfuscated files')
      .edit(handleEditProject, 'Edit project')
      .delete(handleDeleteSingleProject, 'Delete project')
      .build()
  ], [handleEditProject, handleDeleteSingleProject, handleDownloadObfuscatedFiles])

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
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false)
          setProjectToEdit(null)
        }}
        onSubmit={handleEditProjectSubmit}
        project={projectToEdit}
      />

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Projects"
        description={`You are about to permanently delete ${selectedProjects.length} project${selectedProjects.length !== 1 ? 's' : ''}. This action cannot be undone and will remove all associated data including documents, files, and configurations.`}
        confirmationText="delete"
        confirmButtonText="Delete Forever"
        variant="destructive"
      />

      <ConfirmationDialog
        isOpen={isSingleDeleteDialogOpen}
        onClose={() => {
          setIsSingleDeleteDialogOpen(false)
          setProjectToDelete(null)
        }}
        onConfirm={handleConfirmSingleDelete}
        title="Delete Project"
        description={`You are about to permanently delete the project "${projectToDelete?.name}". This action cannot be undone and will remove all associated data including documents, files, and configurations.`}
        confirmationText="delete"
        confirmButtonText="Delete Forever"
        variant="destructive"
      />
    </WidgetContainer>
  )
}
