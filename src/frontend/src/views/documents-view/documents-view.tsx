import { useNavigate, useParams } from 'react-router-dom';
import { DocumentsDataTable } from './documents-data-table';
import type { DocumentShallowType } from '@/types';

export function DocumentsView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  // Custom navigation handler for the data table
  const handleSelectDocument = (document: DocumentShallowType) => {
    navigate(`/projects/${projectId}/documents/${document.id}/original-file`);
  };

  return (
    <div className="space-y-6">
      <DocumentsDataTable onDocumentSelect={handleSelectDocument} />
    </div>
  );
}
