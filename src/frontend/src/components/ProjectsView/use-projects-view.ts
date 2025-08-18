import { useMemo, useCallback, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useWorkspace } from '@/context/workspace-provider';
import { ProjectsAPI } from '@/lib/projects-api';
import type { ProjectShallowType, ProjectCreateType, ProjectUpdateType } from '@/types';

export function useProjectsView(onProjectSelect?: (project: ProjectShallowType) => void) {
  const { state, selectProject } = useWorkspace();
  
  // Own project state management
  const [projects, setProjects] = useState<ProjectShallowType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load projects on mount
  useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true);
      setError(null);
      
      const result = await ProjectsAPI.fetchProjects();
      
      if (result.ok) {
        setProjects(result.value);
      } else {
        setError(result.error instanceof Error ? result.error.message : 'Failed to load projects');
      }
      
      setIsLoading(false);
    };

    loadProjects();
  }, []);
  
  // Dialog state management
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProjectForEdit, setSelectedProjectForEdit] = useState<ProjectShallowType | null>(null);
  const [selectedProjectForDelete, setSelectedProjectForDelete] = useState<ProjectShallowType | null>(null);

  // Load projects utility
  const refreshProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const result = await ProjectsAPI.fetchProjects();
    
    if (result.ok) {
      setProjects(result.value);
    } else {
      setError(result.error instanceof Error ? result.error.message : 'Failed to load projects');
    }
    
    setIsLoading(false);
  }, []);

  // Business logic handlers
  const handleSelectProject = useCallback(async (project: ProjectShallowType) => {
    // Update workspace current project selection
    selectProject(project);
    
    if (onProjectSelect) {
      onProjectSelect(project);
    }
  }, [onProjectSelect, selectProject]);

  const handleCreateProject = useCallback(() => {
    setIsCreateDialogOpen(true);
  }, []);

  const handleCreateProjectSubmit = useCallback(async (projectData: ProjectCreateType) => {
    const result = await ProjectsAPI.createProject(projectData);
    
    if (result.ok) {
      setIsCreateDialogOpen(false);
      // Refresh the projects list
      await refreshProjects();
    } else {
      // Error handling is done in the API, just re-throw to keep dialog open
      throw result.error;
    }
  }, [refreshProjects]);

  const handleEditProject = useCallback((project: ProjectShallowType) => {
    setSelectedProjectForEdit(project);
    setIsEditDialogOpen(true);
  }, []);

  const handleEditProjectSubmit = useCallback(async (projectData: { name: string; description: string }) => {
    if (!selectedProjectForEdit) return;
    
    // Transform dialog data to API format
    const updateData: ProjectUpdateType = {
      name: projectData.name,
      description: projectData.description || undefined,
    };
    
    const result = await ProjectsAPI.updateProject(selectedProjectForEdit.id, updateData);
    
    if (result.ok) {
      setIsEditDialogOpen(false);
      setSelectedProjectForEdit(null);
      // Refresh the projects list
      await refreshProjects();
    } else {
      // Error handling is done in the API, just re-throw to keep dialog open
      throw result.error;
    }
  }, [selectedProjectForEdit, refreshProjects]);

  const handleDeleteProject = useCallback((project: ProjectShallowType) => {
    setSelectedProjectForDelete(project);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDeleteProjectConfirm = useCallback(async () => {
    if (!selectedProjectForDelete) return;
    
    const result = await ProjectsAPI.deleteProjects([selectedProjectForDelete]);
    
    if (result.ok) {
      setIsDeleteDialogOpen(false);
      setSelectedProjectForDelete(null);
      // Refresh the projects list
      await refreshProjects();
    } else {
      // Error handling is done in the API, just re-throw to keep dialog open
      throw result.error;
    }
  }, [selectedProjectForDelete, refreshProjects]);

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
    // Own state management
    projects,
    currentProject: state.currentProject,
    isLoading,
    error,
    
    // Dialog state and handlers
    dialogState,
    
    // Action handlers
    actionHandlers,
    
    // Utility functions
    refreshProjects,
  };
}
