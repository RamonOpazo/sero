import { cn } from "@/lib/utils"

type WidgeExtraProps = { expanded?: boolean, orthocentered?: boolean }

export function WidgetContainer({ expanded, orthocentered, className, ...props }: React.ComponentProps<"div"> & WidgeExtraProps) {
  return (
    <div
      data-slot="widget-container"
      className={cn(
        "flex flex-col gap-4 h-full overflow-hidden",
        `${expanded && "flex-1 h-full w-full"}`,
        `${orthocentered && "justify-center items-center"}`,
        className
      )}
      {...props}
    />
  )
}

export function Widget({ expanded, orthocentered, className, ...props }: React.ComponentProps<"div"> & WidgeExtraProps) {
  return (
    <div
      data-slot="widget"
      className={cn(
        "flex flex-col gap-4 py-4 bg-muted/50 rounded-md",
        `${expanded && "flex-1 h-full w-full"}`,
        `${orthocentered && "justify-center items-center"}`,
        className
      )}
      {...props}
    />
  )
}

export function WidgetHeader({ expanded, orthocentered, className, ...props }: React.ComponentProps<"div"> & WidgeExtraProps) {
  return (
    <div
      data-slot="widget-header"
      className={cn(
        "flex flex-col gap-1.5 px-4",
        `${expanded && "flex-1 h-full w-full"}`,
        `${orthocentered && "justify-center items-center"}`,
        className
      )}
      {...props}
    />
  )
}

export function WidgetTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="widget-title"
      className={cn(
        "leading-none font-semibold",
        className
      )}
      {...props}
    />
  )
}

export function WidgetDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="widget-title"
      className={cn(
        "text-muted-foreground text-sm",
        className
      )}
      {...props}
    />
  )
}

export function WidgetBody({ expanded, orthocentered, className, ...props }: React.ComponentProps<"div"> & WidgeExtraProps) {
  return (
    <div
      data-slot="widget-content"
      className={cn(
        "flex flex-col gap-4 px-4",  
        `${expanded && "flex-1 h-full w-full"}`,
        `${orthocentered && "justify-center items-center"}`,
        className
      )}
      {...props}
    />
  )
}

export function WidgetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="widghet-footer"
      className={cn(
        "flex flex-shrink-0 flex-col gap-1.5 px-4",
        className
      )}
      {...props}
    />
  )
}