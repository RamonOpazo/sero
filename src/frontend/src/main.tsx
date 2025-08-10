import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import './index.css'
import App from './App.tsx'

// Configure PDF.js worker - using local file to avoid CORS issues
pdfjs.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.js'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
