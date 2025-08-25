import { useNavigate } from 'react-router-dom';
import { ProjectsDataTable } from './projects-data-table';
import type { ProjectShallowType } from '@/types';

export function ProjectsView() {
  const navigate = useNavigate();

  // Custom navigation handler for the data table
  const handleSelectProject = (project: ProjectShallowType) => {
    navigate(`/projects/${project.id}/documents`);
  };

  return (
    <ProjectsDataTable onProjectSelect={handleSelectProject} />
  );
}
