import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { LucideIcon } from 'lucide-react'
import { Info, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react'
import type { TypedMessage, TypedMessageVariant } from '@/components/shared/typed-confirmation-dialog'

export interface InformationDialogProps {
  isOpen: boolean,
  onClose: () => void,
  title: string,
  description?: string | ReactNode,
  messages?: TypedMessage[],
  children?: ReactNode,
}

const messageIconByVariant: Record<TypedMessageVariant, LucideIcon> = {
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
  success: CheckCircle2,
}

const alertColorClasses: Record<TypedMessageVariant, string> = {
  info: "border-blue-500/30 bg-blue-500/5 [&>svg]:text-blue-600 *:data-[slot=alert-title]:text-blue-700 *:data-[slot=alert-description]:text-blue-700/80 dark:[&>svg]:text-blue-400 dark:*:data-[slot=alert-title]:text-blue-300 dark:*:data-[slot=alert-description]:text-blue-300/80",
  warning: "border-amber-500/30 bg-amber-500/5 [&>svg]:text-amber-600 *:data-[slot=alert-title]:text-amber-700 *:data-[slot=alert-description]:text-amber-700/80 dark:[&>svg]:text-amber-400 dark:*:data-[slot=alert-title]:text-amber-300 dark:*:data-[slot=alert-description]:text-amber-300/80",
  success: "border-emerald-500/30 bg-emerald-500/5 [&>svg]:text-emerald-600 *:data-[slot=alert-title]:text-emerald-700 *:data-[slot=alert-description]:text-emerald-700/80 dark:[&>svg]:text-emerald-400 dark:*:data-[slot=alert-title]:text-emerald-300 dark:*:data-[slot=alert-description]:text-emerald-300/80",
  error: "border-destructive/40 bg-destructive/5",
}

export function InformationDialog({ isOpen, onClose, title, description, messages = [], children }: InformationDialogProps) {
  const handleOpenChange = () => {
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[60ch]">
        <DialogHeader>
          <DialogTitle className={cn('truncate')}>{title}</DialogTitle>
          {description ? (
            <DialogDescription>
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {messages.length > 0 && (
          <div className="space-y-2">
            {messages.map((m, idx) => {
              const variant = m.variant ?? 'info'
              const Icon = m.icon ?? messageIconByVariant[variant]
              const shadcnVariant = variant === 'error' ? 'destructive' : 'default'
              return (
                <Alert
                  key={m.id ?? idx}
                  variant={shadcnVariant}
                  className={cn('items-start', alertColorClasses[variant], m.className)}
                >
                  <Icon className="translate-y-0.5" />
                  {m.title ? <AlertTitle>{m.title}</AlertTitle> : null}
                  {m.description ? (
                    <AlertDescription>
                      {m.description}
                    </AlertDescription>
                  ) : null}
                </Alert>
              )
            })}
          </div>
        )}

        {children ? (
          <div className="mt-2">
            {children}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

