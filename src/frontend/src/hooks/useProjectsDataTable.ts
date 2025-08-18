import { useMemo, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useProject } from '@/context/ProjectProvider';
import type { ProjectShallowType, ProjectCreateType, ProjectUpdateType } from '@/types';

export function useProjectsDataTable(onProjectSelect?: (project: ProjectShallowType) => void) {
  const { state, createProject, updateProject, deleteProjects } = useProject();
  
  // Dialog state management
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProjectForEdit, setSelectedProjectForEdit] = useState<ProjectShallowType | null>(null);
  const [selectedProjectForDelete, setSelectedProjectForDelete] = useState<ProjectShallowType | null>(null);

  // Business logic handlers
  const handleSelectProject = useCallback(async (project: ProjectShallowType) => {
    if (onProjectSelect) {
      onProjectSelect(project);
    }
  }, [onProjectSelect]);

  const handleCreateProject = useCallback(() => {
    setIsCreateDialogOpen(true);
  }, []);

  const handleCreateProjectSubmit = useCallback(async (projectData: ProjectCreateType) => {
    try {
      await createProject(projectData);
      setIsCreateDialogOpen(false);
    } catch (error) {
      // Error handling is done in the context, just re-throw to keep dialog open
      throw error;
    }
  }, [createProject]);

  const handleEditProject = useCallback((project: ProjectShallowType) => {
    setSelectedProjectForEdit(project);
    setIsEditDialogOpen(true);
  }, []);

  const handleEditProjectSubmit = useCallback(async (projectData: { name: string; description: string }) => {
    if (!selectedProjectForEdit) return;
    
    try {
      // Transform dialog data to API format
      const updateData: ProjectUpdateType = {
        name: projectData.name,
        description: projectData.description || undefined,
      };
      
      await updateProject(selectedProjectForEdit.id, updateData);
      setIsEditDialogOpen(false);
      setSelectedProjectForEdit(null);
    } catch (error) {
      // Error handling is done in the context, just re-throw to keep dialog open
      throw error;
    }
  }, [selectedProjectForEdit, updateProject]);

  const handleDeleteProject = useCallback((project: ProjectShallowType) => {
    setSelectedProjectForDelete(project);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDeleteProjectConfirm = useCallback(async () => {
    if (!selectedProjectForDelete) return;
    
    try {
      await deleteProjects([selectedProjectForDelete]);
      setIsDeleteDialogOpen(false);
      setSelectedProjectForDelete(null);
    } catch (error) {
      // Error handling is done in the context, just re-throw to keep dialog open
      throw error;
    }
  }, [selectedProjectForDelete, deleteProjects]);

  const handleCloseDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(false);
    setSelectedProjectForDelete(null);
  }, []);

  const handleCopyProjectId = useCallback((project: ProjectShallowType) => {
    navigator.clipboard.writeText(project.id);
    toast.success('Project ID copied to clipboard', {
      description: `ID: ${project.id}`,
    });
  }, []);

  // Dialog state and handlers
  const dialogState = useMemo(() => ({
    create: {
      isOpen: isCreateDialogOpen,
      onClose: () => setIsCreateDialogOpen(false),
      onSubmit: handleCreateProjectSubmit,
    },
    edit: {
      isOpen: isEditDialogOpen,
      onClose: () => setIsEditDialogOpen(false),
      onSubmit: handleEditProjectSubmit,
      project: selectedProjectForEdit,
    },
    delete: {
      isOpen: isDeleteDialogOpen,
      onClose: handleCloseDeleteDialog,
      onConfirm: handleDeleteProjectConfirm,
      selectedProject: selectedProjectForDelete,
    },
  }), [
    isCreateDialogOpen,
    isEditDialogOpen,
    isDeleteDialogOpen,
    selectedProjectForEdit,
    selectedProjectForDelete,
    handleCreateProjectSubmit,
    handleEditProjectSubmit,
    handleDeleteProjectConfirm,
    handleCloseDeleteDialog,
  ]);

  // Action handlers for table
  const actionHandlers = useMemo(() => ({
    onSelectProject: handleSelectProject,
    onCreateProject: handleCreateProject,
    onEditProject: handleEditProject,
    onDeleteProject: handleDeleteProject,
    onCopyProjectId: handleCopyProjectId,
  }), [
    handleSelectProject,
    handleCreateProject,
    handleEditProject,
    handleDeleteProject,
    handleCopyProjectId,
  ]);

  return {
    // State from context
    projects: state.projects,
    currentProject: state.currentProject,
    isLoading: state.isLoadingProjects,
    error: state.projectsError,
    
    // Dialog state and handlers
    dialogState,
    
    // Action handlers
    actionHandlers,
  };
}
