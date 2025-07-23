import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  message: string
  buttonText: string
  buttonIcon?: ReactNode
  onButtonClick?: () => void
}

export function EmptyState({ message, buttonText, buttonIcon, onButtonClick }: EmptyStateProps) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center">
      <div className="text-center max-w-md px-4">
        <p className="text-muted-foreground mb-6 text-lg leading-relaxed">
          {message}
        </p>
        <Button onClick={onButtonClick} size="lg">
          {buttonIcon && <span className="mr-2">{buttonIcon}</span>}
          {buttonText}
        </Button>
      </div>
    </div>
  )
}
