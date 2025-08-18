import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/context/workspace-provider';
import { ProjectsDataTable } from './ProjectsDataTable';
import type { ProjectShallowType } from '@/types';

export function ProjectsView() {
  const navigate = useNavigate();
  const { state } = useWorkspace();

  // Custom navigation handler for the data table
  const handleSelectProject = (project: ProjectShallowType) => {
    navigate(`/projects/${project.id}/documents`);
  };

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

  return (
    <div className="space-y-6">
      <ProjectsDataTable onProjectSelect={handleSelectProject} />
    </div>
  );
}
