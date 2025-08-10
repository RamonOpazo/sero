import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ThemeProvider } from '@/context';
import { MainLayout } from '@/views/MainLayout';
import { ProjectsView } from '@/views/ProjectsView';
import { DocumentsView } from '@/views/DocumentsView';
import { FileViewer } from '@/views/FileViewer';
import { CryptoTest } from '@/components/CryptoTest';

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

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="sero-ui-theme">
      <Router>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<ProjectsView />} />
            
            {/* Development crypto test route */}
            <Route path="/crypto-test" element={<CryptoTest />} />
            
            {/* Redirect /projects/:projectId to /projects/:projectId/documents */}
            <Route path="/projects/:projectId" element={<ProjectRedirect />} />
            
            <Route path="/projects/:projectId/documents" element={<DocumentsView />} />
            
            {/* Redirect /projects/:projectId/documents/:documentId to /projects/:projectId/documents/:documentId/original-file */}
            <Route path="/projects/:projectId/documents/:documentId" element={<DocumentRedirect />} />
            
            <Route path="/projects/:projectId/documents/:documentId/original-file" element={<FileViewer fileType="original" />} />
            <Route path="/projects/:projectId/documents/:documentId/redacted-file" element={<FileViewer fileType="redacted" />} />
            
            {/* Redirect all other routes to projects */}
            <Route path="*" element={<Navigate to="/projects" replace />} />
          </Routes>
        </MainLayout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
