import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ThemeProvider } from '@/context';
import { RefactorLayout } from '@/views/RefactorLayout';
import { RefactorProjectsView } from '@/views/RefactorProjectsView';
import { RefactorDocumentsView } from '@/views/RefactorDocumentsView';
import { RefactorFileViewer } from '@/views/RefactorFileViewer';

// Redirect component for /projects/:projectId -> /projects/:projectId/documents
function ProjectRedirect() {
  const { projectId } = useParams<{ projectId: string }>();
  return <Navigate to={`/projects/${projectId}/documents`} replace />;
}

// Redirect component for /projects/:projectId/documents/:documentId -> /projects/:projectId/documents/:documentId/original-file
function DocumentRedirect() {
  const { projectId, documentId } = useParams<{ projectId: string; documentId: string }>();
  return <Navigate to={`/projects/${projectId}/documents/${documentId}/original-file`} replace />;
}

function RefactorApp() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="sero-ui-theme">
      <Router>
        <RefactorLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<RefactorProjectsView />} />
            
            {/* Redirect /projects/:projectId to /projects/:projectId/documents */}
            <Route path="/projects/:projectId" element={<ProjectRedirect />} />
            
            <Route path="/projects/:projectId/documents" element={<RefactorDocumentsView />} />
            
            {/* Redirect /projects/:projectId/documents/:documentId to /projects/:projectId/documents/:documentId/original-file */}
            <Route path="/projects/:projectId/documents/:documentId" element={<DocumentRedirect />} />
            
            <Route path="/projects/:projectId/documents/:documentId/original-file" element={<RefactorFileViewer fileType="original" />} />
            <Route path="/projects/:projectId/documents/:documentId/redacted-file" element={<RefactorFileViewer fileType="redacted" />} />
            
            {/* Redirect all other routes to projects */}
            <Route path="*" element={<Navigate to="/projects" replace />} />
          </Routes>
        </RefactorLayout>
      </Router>
    </ThemeProvider>
  );
}

export default RefactorApp;
