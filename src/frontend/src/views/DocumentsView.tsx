import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDocuments } from '@/hooks/useDocuments';
import { DocumentsDataTable } from './DocumentsDataTable';
import type { DocumentShallowType } from '@/types';

export function DocumentsView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { loading, error, refreshDocumentsForProject } = useDocuments();

  useEffect(() => {
    if (projectId) {
      refreshDocumentsForProject(projectId);
    }
  }, [projectId, refreshDocumentsForProject]);

  // Custom navigation handler for the data table
  const handleSelectDocument = (document: DocumentShallowType) => {
    navigate(`/projects/${projectId}/documents/${document.id}/original-file`);
  };

  const handleBackToProjects = () => {
    navigate('/projects');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load documents</p>
          <p className="text-sm text-muted-foreground">{String(error)}</p>
          <Button
            variant="outline"
            onClick={handleBackToProjects}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DocumentsDataTable onDocumentSelect={handleSelectDocument} />
    </div>
  );
}
