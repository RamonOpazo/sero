import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Ghost } from 'lucide-react'

interface EmptyStateProps {
  message: string,
  buttonText: string,
  buttonIcon?: ReactNode,
  onButtonClick?: () => void,
}

export function EmptyState({ message, buttonText, buttonIcon, onButtonClick }: EmptyStateProps) {
  return (
    <div className="relative h-full w-full flex items-center justify-center p-6 overflow-hidden">
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-gradient-to-br from-primary/15 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-tr from-purple-500/15 to-transparent blur-3xl" />

      {/* Card-like container */}
      <div className="relative z-10 flex flex-col items-center text-center gap-4 rounded-md border bg-card/60 backdrop-blur-sm shadow-sm px-8 py-10">
        <div className="flex items-center justify-center">
          <div className="size-16 rounded-full ring-1 ring-primary/20 bg-primary/10 flex items-center justify-center shadow-inner">
            <Ghost className="size-8 text-primary animate-pulse" strokeWidth={1.25} />
          </div>
        </div>

        <p className="text-muted-foreground text-base leading-relaxed max-w-prose">
          {message}
        </p>

        <Button onClick={onButtonClick} className="mt-2">
          {buttonIcon && <span className="mr-2">{buttonIcon}</span>}
          {buttonText}
        </Button>
      </div>
    </div>
  )
}
