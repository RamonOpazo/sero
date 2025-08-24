import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Ghost, Hourglass } from 'lucide-react'
import { WidgetContainer, Widget, WidgetContent } from '../Widget'

interface EmptyStateProps {
  variant?: "default" | "await",
  message: string | React.ReactNode,
  buttonText?: string,
  buttonIcon?: ReactNode,
  onButtonClick?: () => void,
}

export function EmptyState({ variant="default", message, buttonText, buttonIcon, onButtonClick }: EmptyStateProps) {
  return (
    <WidgetContainer expanded orthocentered className='min-h-full'>
      <Widget expanded orthocentered>
        <WidgetContent expanded orthocentered>
          {variant === "default" && (
            <div className="size-16 rounded-full ring-1 ring-primary/20 bg-background flex items-center justify-center shadow-inner">
              <Ghost className="size-8 text-primary animate-pulse" strokeWidth={1.25} />
            </div>
          )}

          {variant === "await" && (
            <div className="size-16 rounded-full ring-1 ring-primary/20 bg-background flex items-center justify-center shadow-inner">
              <Hourglass className="size-8 text-primary animate-spin" strokeWidth={1.25} />
            </div>
          )}

          <p className="text-muted-foreground text-base leading-relaxed max-w-prose">
            {message}
          </p>

          {buttonText && (
            <Button onClick={onButtonClick}>
              {buttonIcon && <span className="mr-2">{buttonIcon}</span>}
              {buttonText}
            </Button>
          )}
        </WidgetContent>
      </Widget>
    </WidgetContainer>
  )
}
