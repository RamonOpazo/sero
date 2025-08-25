import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { TypedConfirmationDialog, type TypedMessage } from '@/components/shared/typed-confirmation-dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export type FieldDescriptor =
  | ({ type: 'text' } & BaseField)
  | ({ type: 'textarea'; rows?: number } & BaseField)
  | ({ type: 'select'; options: { value: string; label: string }[] } & BaseField)
  | ({ type: 'checkbox' } & BaseField)
  | ({ type: 'switch' } & BaseField)
  | ({ type: 'file'; accept?: string; multiple?: boolean } & BaseField)
  | ({ type: 'number'; min?: number; max?: number; step?: number } & BaseField)

interface BaseField {
  name: string,
  label: string,
  placeholder?: string,
  description?: string,
  required?: boolean,
  tooltip?: string,
}

export interface FormConfirmationDialogProps {
  isOpen: boolean,
  onClose: () => void,
  // New: declarative fields and submit handler
  fields?: FieldDescriptor[],
  initialValues?: Record<string, any>,
  onSubmit?: (values: Record<string, any>) => Promise<void>,
  // Back-compat: raw React nodes and confirm handler
  formFields?: React.ReactNode[],
  onConfirm?: () => Promise<void>,
  // Base dialog props
  title: string,
  description?: string | ReactNode,
  confirmButtonText: string,
  cancelButtonText: string,
  variant?: 'destructive' | 'default',
  messages?: TypedMessage[],
}

export function FormConfirmationDialog(props: FormConfirmationDialogProps) {
  const {
    isOpen,
    onClose,
    // declarative
    fields,
    initialValues,
    onSubmit,
    // back-compat
    formFields,
    onConfirm,
    // base dialog
    title,
    description,
    confirmButtonText,
    cancelButtonText,
    variant,
    messages,
  } = props

  // Decide if we're using declarative mode
  const isDeclarative = Array.isArray(fields) && fields.length > 0 && typeof onSubmit === 'function'

  // Build RHF context when declarative
  const form = useForm<Record<string, any>>({
    defaultValues: useMemo(() => ({ ...(initialValues || {}) }), [initialValues]),
    mode: 'onSubmit',
  })

  // Render a field based on descriptor
  const renderField = (fd: FieldDescriptor) => (
    <FormField
      key={fd.name}
      control={form.control}
      name={fd.name as any}
      rules={{ required: fd.required ? `${fd.label} is required` : false }}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center gap-1">
            <FormLabel>{fd.label}</FormLabel>
            {fd.tooltip ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground cursor-help text-xs">?</span>
                </TooltipTrigger>
                <TooltipContent sideOffset={4}>{fd.tooltip}</TooltipContent>
              </Tooltip>
            ) : null}
          </div>
          <FormControl>
            {fd.type === 'text' ? (
              <Input placeholder={fd.placeholder} {...field} />
            ) : fd.type === 'textarea' ? (
              <Textarea placeholder={fd.placeholder} rows={(fd as any).rows ?? 8} {...field} />
            ) : fd.type === 'select' ? (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={fd.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {(fd as any).options?.map((opt: any) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : fd.type === 'checkbox' ? (
              <Checkbox checked={!!field.value} onCheckedChange={field.onChange as any} />
            ) : fd.type === 'switch' ? (
              <Switch checked={!!field.value} onCheckedChange={field.onChange as any} />
            ) : fd.type === 'file' ? (
              <Input
                type="file"
                accept={(fd as any).accept}
                multiple={(fd as any).multiple}
                onChange={(e) => {
                  const files = e.target.files;
                  (field as any).onChange(files && files.length > 0 ? (fd as any).multiple ? Array.from(files) : files[0] : null);
                }}
              />
            ) : fd.type === 'number' ? (
              <Input
                type="number"
                placeholder={fd.placeholder}
                min={(fd as any).min}
                max={(fd as any).max}
                step={(fd as any).step}
                value={field.value}
                onChange={(e) => {
                  const raw = e.target.value;
                  (field as any).onChange(raw);
                }}
              />
            ) : null}
          </FormControl>
          {fd.description ? <p className="text-xs text-muted-foreground">{fd.description}</p> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  )

  // Build form content for TypedConfirmationDialog
  const builtFields = isDeclarative ? [
    <Form key="__built_form__" {...form}>
      <form onSubmit={form.handleSubmit(async (values) => { await (onSubmit as any)(values) })} className="space-y-4">
        {fields!.map(renderField)}
      </form>
    </Form>,
  ] : (formFields || [])

  // Confirm handler wrapper: when declarative, validate & submit; reject to keep dialog open on errors
  const confirmHandler = async () => {
    if (isDeclarative) {
      const valid = await form.trigger()
      if (!valid) throw new Error('Form validation failed')
      const values = form.getValues()
      await (onSubmit as any)(values)
      return
    }
    // back-compat
    if (typeof onConfirm === 'function') {
      await onConfirm()
    }
  }

  return (
    <TypedConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={confirmHandler}
      title={title}
      description={description}
      formFields={builtFields}
      confirmationText={''}
      confirmButtonText={confirmButtonText}
      cancelButtonText={cancelButtonText}
      variant={variant}
      messages={messages}
      showConfirmationInput={false}
    />
  )
}

