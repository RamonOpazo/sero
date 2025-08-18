import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'

export function ApiSwaggerEmbed() {
  return (
    <div className="max-w bg-muted/50">
      <div className="rounded-lg overflow-hidden border">
        <SwaggerUI url="/openapi.json" docExpansion="list" deepLinking={true} defaultModelsExpandDepth={1} />
      </div>
    </div>
  )
}
