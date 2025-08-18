import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ThemeProvider } from '@/providers';
import { MainLayout } from '@/components/layout';
import { HomePage } from '@/pages/HomePage';
import { ProjectsView } from '@/components/projects-view';
import { DocumentsView } from '@/components/documents-view';
import { EditorView } from '@/components/editor-view';
import { DocumentationRenderer } from '@/components/DocumentationRenderer';
import { SettingsPage } from '@/pages/SettingsPage';
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

// Redirect component for API docs
function ApiDocsRedirect() {
  React.useEffect(() => {
    window.location.href = '/docs';
  }, []);
  return null;
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="sero-ui-theme">
      <Router>
        <MainLayout>
          <Routes>
            {/* Home page */}
            <Route path="/" element={<HomePage />} />

            {/* Projects */}
            <Route path="/projects" element={<ProjectsView />} />

            {/* Documentation routes */}
            <Route path="/documentation" element={<DocumentationRenderer docName="index" />} />
            <Route path="/documentation/:docName" element={<DocumentationRenderer />} />

            {/* Developer routes */}
            <Route path="/dev/api-swagger" element={<ApiDocsRedirect />} />
            <Route path="/dev/crypto-test" element={<CryptoTest />} />

            {/* Settings */}
            <Route path="/settings" element={<SettingsPage />} />

            {/* Redirect /projects/:projectId to /projects/:projectId/documents */}
            <Route path="/projects/:projectId" element={<ProjectRedirect />} />

            <Route path="/projects/:projectId/documents" element={<DocumentsView />} />

            {/* Redirect /projects/:projectId/documents/:documentId to /projects/:projectId/documents/:documentId/original-file */}
            <Route path="/projects/:projectId/documents/:documentId" element={<DocumentRedirect />} />

            <Route path="/projects/:projectId/documents/:documentId/original-file" element={<EditorView fileType="original" />} />
            <Route path="/projects/:projectId/documents/:documentId/redacted-file" element={<EditorView fileType="redacted" />} />

            {/* Redirect all other routes to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MainLayout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
