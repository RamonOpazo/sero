import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './components/ThemeProvider'
import { Layout } from './components/Layout'
import { ProjectsView } from './components/ProjectsView'
import { DocumentsView } from './components/DocumentsView'
import { DocumentEditor } from './components/DocumentEditor'

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="sero-ui-theme">
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<ProjectsView />} />
            <Route path="/project/:projectId" element={<DocumentsView />} />
            <Route path="/project/:projectId/document/:documentId" element={<DocumentEditor />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  )
}

export default App
