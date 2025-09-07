"use client"

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, Info, XCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TypedMessageVariant = 'info' | 'warning' | 'error' | 'success'

export interface TypedMessage {
  id?: string | number,
  title?: string,
  description?: string,
  variant?: TypedMessageVariant,
  icon?: LucideIcon,
  className?: string,
}

interface TypedConfirmationDialogProps {
  isOpen: boolean,
  onClose: () => void,
  onConfirm: () => Promise<void>,
  title: string,
  description?: string | React.ReactNode,
  formFields?: React.ReactNode[],
  confirmationText: string,
  confirmButtonText?: string,
  cancelButtonText?: string,
  variant?: 'destructive' | 'default',
  messages?: TypedMessage[],
  showConfirmationInput?: boolean,
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

export function TypedConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  formFields = [],
  confirmationText,
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
  variant = 'destructive',
  messages = [],
  showConfirmationInput = true,
}: TypedConfirmationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const confirmSchema = useMemo(() =>
    z.object({
      confirmation: z.string().refine(
        (val) => !showConfirmationInput || val.toLowerCase() === confirmationText.toLowerCase(),
        { message: `You must type "${confirmationText}" to confirm` },
      ),
    }),
    [confirmationText, showConfirmationInput])

  type ConfirmFormData = z.infer<typeof confirmSchema>

  const form = useForm<ConfirmFormData>({
    resolver: zodResolver(confirmSchema),
    defaultValues: {
      confirmation: '',
    },
  })

  useEffect(() => {
    if (isOpen) {
      form.reset()
    }
  }, [isOpen, form])

  const handleConfirm = async (data: ConfirmFormData) => {
    if (showConfirmationInput && data.confirmation.toLowerCase() !== confirmationText.toLowerCase()) return

    setIsSubmitting(true)
    try {
      await onConfirm()
      form.reset()
      onClose()
    } catch (error) {
      console.error('Error during confirmation action:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset()
      onClose()
    }
  }

  const currentValue = form.watch('confirmation')
  const isConfirmationMatch = !showConfirmationInput || (currentValue?.toLowerCase() === confirmationText.toLowerCase())

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[60ch]">
        <DialogHeader>
          <DialogTitle className={cn('truncate', variant === 'destructive' && 'text-destructive')}>
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription>
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {messages.length > 0 && (
          <div className="space-y-4 my-2">
            {messages.map((m, idx) => {
              const Icon = m.icon ?? messageIconByVariant[m.variant ?? 'info']
              const variant = m.variant ?? 'info'
              const shadcnVariant = variant === 'error' ? 'destructive' : 'default'
              return (
                <Alert
                  key={m.id ?? idx}
                  variant={shadcnVariant}
                  className={cn('items-start', alertColorClasses[variant], m.className)}
                >
                  <Icon />
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

        {/* Render provided form fields regardless of confirmation input usage */}
        {formFields && formFields.length > 0 ? (
          <div className="mt-2 space-y-4">
            {formFields}
          </div>
        ) : null}

        {/* Optional confirmation input */}
        {showConfirmationInput ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleConfirm)} className="mt-2 space-y-4">
              <FormField
                control={form.control}
                name="confirmation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type "{confirmationText}" to confirm</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={confirmationText}
                        {...field}
                        disabled={isSubmitting}
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  {cancelButtonText}
                </Button>
                <Button
                  type="submit"
                  variant={variant}
                  disabled={isSubmitting || !isConfirmationMatch}
                >
                  {isSubmitting ? 'Processing...' : confirmButtonText}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <DialogFooter className="gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {cancelButtonText}
            </Button>
            <Button
              type="button"
              variant={variant}
              disabled={isSubmitting}
              onClick={async () => {
                setIsSubmitting(true)
                try {
                  await onConfirm()
                  onClose()
                } catch (e) {
                  console.error('Error during confirmation action:', e)
                } finally {
                  setIsSubmitting(false)
                }
              }}
            >
              {isSubmitting ? 'Processing...' : confirmButtonText}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

