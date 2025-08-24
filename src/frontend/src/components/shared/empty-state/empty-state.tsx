import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Ghost } from 'lucide-react'
import { WidgetContainer, Widget, WidgetContent } from '../Widget'

interface EmptyStateProps {
  message: string,
  buttonText: string,
  buttonIcon?: ReactNode,
  onButtonClick?: () => void,
}

export function EmptyState({ message, buttonText, buttonIcon, onButtonClick }: EmptyStateProps) {
  return (
    <WidgetContainer expanded orthocentered className='min-h-full'>
      <Widget expanded orthocentered>
        <WidgetContent expanded orthocentered>
            <div className="size-16 rounded-full ring-1 ring-primary/20 bg-background flex items-center justify-center shadow-inner">
              <Ghost className="size-8 text-primary animate-pulse" strokeWidth={1.25} />
            </div>

          <p className="text-muted-foreground text-base leading-relaxed max-w-prose">
            {message}
          </p>

          <Button onClick={onButtonClick}>
            {buttonIcon && <span className="mr-2">{buttonIcon}</span>}
            {buttonText}
          </Button>

        </WidgetContent>
      </Widget>
    </WidgetContainer>
  )
}
