import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './components/providers'
import { Layout } from './components/views/Layout'
import { ProjectsView } from './components/views/ProjectsView'
import { DocumentsView } from './components/views/DocumentsView'
import { FilesView } from './components/views/FilesView'

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="sero-ui-theme">
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<ProjectsView />} />
            <Route path="/project/:projectId" element={<DocumentsView />} />
            <Route path="/project/:projectId/document/:documentId" element={<FilesView />} />
            <Route path="/project/:projectId/document/:documentId/file/:fileId" element={<FilesView />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  )
}

export default App
