import SwaggerUI from 'swagger-ui-react'
import "swagger-ui-react/swagger-ui.css"
import './swagger-page.css'
import { ScrollArea } from '@/components/ui/scroll-area'

export function SwaggerPage() {
  return (
    <div className="relative py-[2rem] px-[3rem] bg-white rounded-md">
      <ScrollArea>
        <SwaggerUI url="/api/openapi.json" />
      </ScrollArea>
    </div>
  )
}
