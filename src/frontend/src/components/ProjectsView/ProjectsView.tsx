import { useNavigate } from 'react-router-dom';
import { ProjectsDataTable } from './ProjectsDataTable';
import type { ProjectShallowType } from '@/types';

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
