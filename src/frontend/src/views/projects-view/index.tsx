import { useNavigate } from 'react-router-dom';
import { ProjectsDataTable } from './projects-data-table';
import type { ProjectShallowType } from '@/types';

// Main ProjectsView Component
export function ProjectsView() {
  const navigate = useNavigate();

  // Custom navigation handler for the data table
  const handleSelectProject = (project: ProjectShallowType) => {
    navigate(`/projects/${project.id}/documents`);
  };

  return (
    <div className="space-y-6">
      <ProjectsDataTable onProjectSelect={handleSelectProject} />
    </div>
  );
}

// Export other components and utilities
export { ProjectsDataTable } from './projects-data-table'
export { useProjectsView } from './use-projects-view'
export * from './dialogs'
