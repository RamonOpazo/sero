import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDocuments } from '@/hooks/useDocuments';
import type { DocumentShallowType } from '@/types';

/**
 * Business logic hook for DocumentsView component
 * Handles document management, navigation, and state management for a specific project
 */
export function useDocumentsView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { loading, error, refreshDocumentsForProject } = useDocuments();

  // Load documents when component mounts or projectId changes
  useEffect(() => {
    if (projectId) {
      refreshDocumentsForProject(projectId);
    }
  }, [projectId, refreshDocumentsForProject]);

  // Navigation handler for document selection
  const handleSelectDocument = (document: DocumentShallowType) => {
    navigate(`/projects/${projectId}/documents/${document.id}/original-file`);
  };

  // Navigation handler to go back to projects list
  const handleBackToProjects = () => {
    navigate('/projects');
  };

  return {
    // State
    projectId,
    loading,
    error,
    
    // Actions
    handleSelectDocument,
    handleBackToProjects,
  };
}
