import { ApiReferenceReact } from '@scalar/api-reference-react'
import '@scalar/api-reference-react/style.css'

export default function ApiReferenceClean() {
  return (
    <div className="max-w">
      <ApiReferenceReact
        configuration={{
          url: '/openapi.json',
          // hideTryIt: true,
          // hideDownloadButton: true,
          // layout: 'modern',
          // darkMode: true,
        }}
      />
    </div>
  )
}
