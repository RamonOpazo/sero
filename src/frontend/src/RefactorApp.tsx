import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/context';
import { RefactorLayout } from '@/views/RefactorLayout';
import { RefactorProjectsView } from '@/views/RefactorProjectsView';
import { RefactorDocumentsView } from '@/views/RefactorDocumentsView';
import { RefactorFileViewer } from '@/views/RefactorFileViewer';

function RefactorApp() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="sero-ui-theme">
      <Router>
        <RefactorLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<RefactorProjectsView />} />
            <Route path="/projects/:projectId/documents" element={<RefactorDocumentsView />} />
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
