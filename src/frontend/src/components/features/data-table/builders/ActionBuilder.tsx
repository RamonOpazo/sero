import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Edit, Trash2, Download, Copy, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ActionConfig<TData> {
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick: (item: TData) => void
  variant?: 'default' | 'destructive'
  separator?: boolean
}

class ActionBuilder<TData> {
  private actions: ActionConfig<TData>[] = []

  // Predefined action helpers
  view(href: (item: TData) => string, label = 'View'): this {
    this.actions.push({
      label,
      icon: Eye,
      onClick: (item) => {
        const url = href(item)
        window.open(url, '_blank')
      },
      variant: 'default'
    })
    return this
  }

  edit(onEdit: (item: TData) => void, label = 'Edit'): this {
    this.actions.push({
      label,
      icon: Edit,
      onClick: onEdit,
      variant: 'default'
    })
    return this
  }

  delete(onDelete: (item: TData) => void, label = 'Delete'): this {
    this.actions.push({
      label,
      icon: Trash2,
      onClick: onDelete,
      variant: 'destructive',
      separator: true
    })
    return this
  }

  download(onDownload: (item: TData) => void, label = 'Download'): this {
    this.actions.push({
      label,
      icon: Download,
      onClick: onDownload,
      variant: 'default'
    })
    return this
  }

  copy(
    getValue: (item: TData) => string, 
    label = 'Copy ID',
    successMessage?: (value: string) => { title: string; description: string }
  ): this {
    this.actions.push({
      label,
      icon: Copy,
      onClick: (item) => {
        const value = getValue(item)
        navigator.clipboard.writeText(value).then(() => {
          const message = successMessage ? successMessage(value) : {
            title: `${label} copied to clipboard`,
            description: `Value: ${value}`
          }
          toast.success(message.title, { description: message.description })
        }).catch((error) => {
          console.error('Failed to copy to clipboard:', error)
          toast.error('Failed to copy to clipboard', {
            description: 'Please try again or copy manually.'
          })
        })
      },
      variant: 'default'
    })
    return this
  }

  custom(action: ActionConfig<TData>): this {
    this.actions.push(action)
    return this
  }

  separator(): this {
    if (this.actions.length > 0) {
      this.actions[this.actions.length - 1].separator = true
    }
    return this
  }

  build(): ColumnDef<TData, unknown> {
    return {
      id: 'actions',
      header: () => <div className="text-center">Actions</div>,
      enableHiding: false,
      cell: ({ row }) => {
        const item = row.original

        return (
          <div className="text-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                {this.actions.map((action, index) => {
                  const Icon = action.icon
                  
                  return (
                    <div key={index}>
                      {action.separator && index > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault()
                          action.onClick(item)
                        }}
                        className={action.variant === 'destructive' ? 'text-destructive' : ''}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {action.label}
                      </DropdownMenuItem>
                    </div>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    }
  }
}

// Convenience function
export const Actions = {
  create<TData>(): ActionBuilder<TData> {
    return new ActionBuilder<TData>()
  }
}

export { ActionBuilder }
