import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './components/providers'
import { Layout } from './components/views/Layout'
import { HomeView, ProjectsView, DocumentsView, FilesView } from './components/views'

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="sero-ui-theme">
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<HomeView />} />
            <Route path="/projects" element={<ProjectsView />} />
            <Route path="/projects/:projectId/documents" element={<DocumentsView />} />
            <Route path="/projects/:projectId/documents/:documentId/files" element={<FilesView />} />
            <Route path="/projects/:projectId/documents/:documentId/files/:fileId" element={<FilesView />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  )
}

export default App
