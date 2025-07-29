import { cn } from "@/lib/utils"

export function WidgetContainer({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="widget-container"
      className={cn(
        "h-full flex flex-1 gap-4 overflow-hidden",
        className
      )}
      {...props}
    />
  )
}

export function Widget({ expanded = false, className, ...props }: React.ComponentProps<"div"> & { expanded?: boolean }) {
  return (
    <div
      data-slot="widget"
      className={cn(
        `bg-muted/50 flex ${expanded ? "flex-1" : "flex-shrink-0"} flex-col gap-4 rounded-md py-4`,
        className
      )}
      {...props}
    />
  )
}

export function WidgetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="widget-header"
      className={cn(
        "flex flex-col gap-1.5 px-4",
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

export function WidgetContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="widget-content"
      className={cn("flex flex-row flex-1 gap-4 px-4", className)}
      {...props}
    />
  )
}

export function WidgetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="widghet-footer"
      className={cn("flex flex-row gap-1.5 px-4", className)}
      {...props}
    />
  )
}