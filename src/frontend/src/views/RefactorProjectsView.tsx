import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderOpen } from 'lucide-react';
import { useRefactorProjects } from '@/hooks/useRefactorProjects';
import { RefactorProjectsDataTable } from './RefactorProjectsDataTable';
import type { ProjectShallowType } from '@/types';

export function RefactorProjectsView() {
  const navigate = useNavigate();
  const { projects, loading, error, refreshProjects } = useRefactorProjects();

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  // Custom navigation handler for the data table
  const handleSelectProject = (project: ProjectShallowType) => {
    navigate(`/projects/${project.id}/documents`);
  };

  if (loading) {
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
          <p className="text-sm text-muted-foreground">{String(error)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SERO Document Management</h1>
        <p className="text-muted-foreground">
          Secure document processing and redaction system
        </p>
      </div>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FolderOpen className="h-5 w-5" />
            <span>Projects</span>
            {projects.length > 0 && (
              <Badge variant="outline">{projects.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Select a project to view its documents. Projects are loaded with shallow data for optimal performance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RefactorProjectsDataTable onProjectSelect={handleSelectProject} />
        </CardContent>
      </Card>
    </div>
  );
}
